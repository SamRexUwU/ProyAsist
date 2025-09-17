from rest_framework import generics, permissions, status, viewsets # Importa viewsets
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate, login, logout
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.tokens import RefreshToken
import qrcode
import base64
import json
from io import BytesIO
from rest_framework import status
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from .permisos import IsEstudiante, IsDocente, IsAdministrador
from django.middleware.csrf import get_token
import calendar
from datetime import date, timedelta
from django.db.models import Prefetch
from django.db.models import Exists, OuterRef
from django.db.models import Count, Case, When, F, Q, Sum
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
import io
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from exponent_server_sdk import PushClient, PushMessage
from math import radians, sin, cos, sqrt, atan2
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action, permission_classes
from django.db.models import Count, Case, When, F, Q
from django.db.models import Prefetch

dias_semana_map = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 
    3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
}

from .models import (
    Usuario, Carrera, Semestre, Materia,
    Estudiante, Docente, Administrador,
    MateriaSemestre, DocenteMateriaSemestre, SesionClase,
    CredencialQR, PermisoAsistencia, RegistroAsistencia, Reporte, Inscripcion, DiaEspecial
)
from .serializers import (
    UsuarioSerializer, CarreraSerializer, SemestreSerializer, MateriaSerializer,
    EstudianteSerializer, DocenteSerializer, AdministradorSerializer,
    MateriaSemestreSerializer, DocenteMateriaSemestreSerializer, SesionClaseSerializer,
    CredencialQRSerializer, PermisoAsistenciaSerializer, RegistroAsistenciaSerializer, ReporteSerializer, MisMateriasSerializer,
    MisMateriasConEstudiantesSerializer, InscripcionSerializer, InscripcionCreateSerializer, MateriaEstudianteSerializer, MateriaSemestreMiniSerializer, DiaEspecialSerializer
)

# ----------------------------------------------------
# Vistas para la gestión de usuarios y autenticación (estas NO son ViewSets)
# ----------------------------------------------------

# La vista de Usuario puede ser un ModelViewSet, pero la dejamos separada por la lógica de password
# Y por la flexibilidad de tener un serializer con create/update personalizado.
# Si solo fueran operaciones básicas de CRUD, un ModelViewSet sería viable.

@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    token = get_token(request)
    return Response({'csrfToken': token})

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.AllowAny] # Ajustar según necesidades de registro/seguridad

# Vistas de login/logout siguen siendo APIView o @api_view
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(request, email=email, password=password)

    if user is not None:
        login(request, user)
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        # Lógica final y precisa para determinar el rol del usuario
        role = None
        if hasattr(user, 'administrador_perfil'):
            role = 'administrador'
        elif hasattr(user, 'docente_perfil'):
            role = 'docente'
        elif hasattr(user, 'estudiante_perfil'):
            role = 'estudiante'

        if role is None:
            # Puedes manejar aquí el caso de un usuario sin un perfil definido
            return Response({'detail': 'Rol de usuario no asignado'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'access': access_token,
            'refresh': str(refresh),
            'user_id': user.pk,
            'email': user.email,
            'role': role,
        }, status=status.HTTP_200_OK)
    else:
        return Response({'detail': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Sesión cerrada exitosamente'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})


# ----------------------------------------------------
# ViewSets para los modelos de la aplicación (¡Usando ModelViewSet!)
# ----------------------------------------------------

class CarreraViewSet(viewsets.ModelViewSet):
    queryset = Carrera.objects.all()
    serializer_class = CarreraSerializer
    permission_classes = [permissions.IsAuthenticated]

class EstudianteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar estudiantes.
    """
    queryset = Estudiante.objects.select_related(
        'usuario', 'carrera', 'semestre_actual'
    )
    serializer_class = EstudianteSerializer
    permission_classes = [permissions.IsAuthenticated, IsEstudiante | IsAdministrador]

    def get_queryset(self):
        qs = Estudiante.objects.select_related(
            'usuario', 'carrera', 'semestre_actual'
        )
        # Filtros opcionales desde la URL
        carrera_id = self.request.query_params.get('carrera_id')
        semestre_id = self.request.query_params.get('semestre_id')

        if carrera_id:
            qs = qs.filter(carrera_id=carrera_id)
        if semestre_id:
            qs = qs.filter(semestre_actual_id=semestre_id)
        return qs
    # --------------------------------------------------------------------------
    # Permisos
    # --------------------------------------------------------------------------
    def get_permissions(self):
        """
        Personaliza los permisos según la acción.
        """
        if self.action in ['resumen_asistencias_estudiante', 'historial_asistencias_estudiante']:
            return [IsEstudiante()]
        return super().get_permissions()

    # --------------------------------------------------------------------------
    # Acciones de estado (activar / desactivar)
    # --------------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar_estudiante(self, request, pk=None):
        """Desactiva al estudiante y a su usuario asociado."""
        try:
            estudiante = self.get_object()
            usuario = estudiante.usuario
            usuario.is_active = False
            usuario.save()
            return Response({'status': 'Estudiante desactivado correctamente'})
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'Estudiante no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='activar')
    def activar_estudiante(self, request, pk=None):
        """Activa al estudiante y a su usuario asociado."""
        try:
            estudiante = self.get_object()
            usuario = estudiante.usuario
            usuario.is_active = True
            usuario.save()
            return Response({'status': 'Estudiante activado correctamente'})
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'Estudiante no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

    # --------------------------------------------------------------------------
    # Resumen de asistencias
    # --------------------------------------------------------------------------
    def _calcular_resumen_asistencias(self, estudiante):
        """
        Calcula el resumen de asistencias por materia para un estudiante dado.
        Retorna una lista de diccionarios con los datos agregados por materia.
        """
        if not estudiante.semestre_actual:
            raise ValueError('El estudiante no tiene un semestre asignado.')

        # Obtener materias únicas del semestre
        materias = Materia.objects.filter(
            materias_por_semestre__semestre=estudiante.semestre_actual
        ).distinct()

        resumen = []

        for materia in materias:
            # Obtener todos los materia_semestre para esta materia en el semestre
            materia_semestres = MateriaSemestre.objects.filter(
                semestre=estudiante.semestre_actual,
                materia=materia
            )

            total_clases = 0
            asistencias = 0
            faltas = 0
            tardanzas = 0

            for ms in materia_semestres:
                # Contar clases por materia_semestre
                total_clases += SesionClase.objects.filter(materia_semestre=ms).count()

                # Agregar asistencias por materia_semestre
                asis = RegistroAsistencia.objects.filter(
                    estudiante=estudiante,
                    sesion__materia_semestre=ms
                ).aggregate(
                    asistencias=Count(Case(When(estado='PRESENTE', then=1))),
                    faltas=Count(Case(When(estado='FALTA', then=1))),
                    tardanzas=Count(Case(When(estado='RETRASO', then=1))),
                )

                asistencias += asis['asistencias'] or 0
                faltas += asis['faltas'] or 0
                tardanzas += asis['tardanzas'] or 0

            porcentaje = (asistencias / total_clases * 100) if total_clases else 0

            resumen.append({
                'materia_id': materia.id,
                'materia_nombre': materia.nombre,
                'total_clases': total_clases,
                'asistencias': asistencias,
                'faltas': faltas,
                'tardanzas': tardanzas,
                'porcentaje_asistencia': round(porcentaje, 2),
            })

        return resumen

    @action(detail=True, methods=['get'], url_path='resumen_asistencias')
    def resumen_asistencias(self, request, pk=None):
        """
        Devuelve el resumen de asistencias de un estudiante por cada materia.
        URL: /api/estudiantes/{pk}/resumen_asistencias/
        """
        try:
            estudiante = self.get_object()
            resumen = self._calcular_resumen_asistencias(estudiante)
            return Response(resumen, status=status.HTTP_200_OK)
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'Estudiante no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='resumen-asistencias')
    def resumen_asistencias_estudiante(self, request):
        """
        Devuelve el resumen de asistencias del estudiante autenticado.
        URL: /api/estudiantes/resumen-asistencias/
        """
        try:
            estudiante = Estudiante.objects.get(usuario=request.user)
            resumen = self._calcular_resumen_asistencias(estudiante)
            return Response(resumen, status=status.HTTP_200_OK)
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'No se encontró un perfil de estudiante para este usuario'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # --------------------------------------------------------------------------
    # Historial de asistencias
    # --------------------------------------------------------------------------
    def _obtener_historial_asistencias(self, estudiante, materia_id):

        if not materia_id:
            raise ValueError('Se requiere el ID de la materia')

        try:
            # Obtener todos los materia_semestre para esta materia en el semestre del estudiante
            materia_semestres = MateriaSemestre.objects.filter(
                semestre=estudiante.semestre_actual,
                materia__id=materia_id
            )
            if not materia_semestres.exists():
                raise ValueError('Materia no encontrada o no pertenece al semestre.')
        except MateriaSemestre.DoesNotExist:
            raise ValueError('Materia no encontrada.')

        # Todas las sesiones de los materia_semestre de esta materia
        sesiones = SesionClase.objects.filter(
            materia_semestre__in=materia_semestres
        ).order_by('-fecha')

        historial = []
        for sesion in sesiones:
            # Buscar el registro de asistencia del estudiante para esta sesión
            registro = RegistroAsistencia.objects.filter(
                estudiante=estudiante,
                sesion=sesion
            ).first()

            historial.append({
                'id': registro.id if registro else None,
                'sesion': {
                    'id': sesion.id,
                    'fecha': sesion.fecha,
                    'hora_inicio': sesion.hora_inicio,
                    'hora_fin': sesion.hora_fin,
                    'tema': sesion.tema or 'Sin tema',
                    'materia_semestre': {
                        'materia': {'nombre': sesion.materia_semestre.materia.nombre},
                        'semestre': {'nombre': sesion.materia_semestre.semestre.nombre},
                        'carrera': {'nombre': sesion.materia_semestre.semestre.carrera.nombre},
                    }
                },
                'estado': registro.estado if registro else 'FALTA',
                'fecha_registro': registro.fecha_registro if registro else None,
            })

        return historial

    @action(detail=False, methods=['get'], url_path='historial-asistencias')
    def historial_asistencias_estudiante(self, request):
        """
        Devuelve el historial detallado de asistencias del estudiante autenticado
        para una materia específica.
        URL: /api/estudiantes/historial-asistencias/?materia={materia_semestre_id}
        """
        try:
            estudiante = Estudiante.objects.get(usuario=request.user)
            historial = self._obtener_historial_asistencias(
                estudiante,
                request.query_params.get('materia')
            )
            return Response(historial, status=status.HTTP_200_OK)
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'No se encontró un perfil de estudiante para este usuario'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='historial_asistencias')
    def historial_asistencias(self, request, pk=None):
        """
        Devuelve el historial detallado de asistencias de un estudiante
        para una materia específica.
        URL: /api/estudiantes/{pk}/historial_asistencias/?materia={materia_semestre_id}
        """
        try:
            estudiante = self.get_object()
            historial = self._obtener_historial_asistencias(
                estudiante,
                request.query_params.get('materia')
            )
            serializer = RegistroAsistenciaSerializer(historial, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Estudiante.DoesNotExist:
            return Response(
                {'error': 'Estudiante no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='historial-sesiones')
    def historial_sesiones(self, request):
        estudiante_id = request.query_params.get('estudiante_id')
        materia_id = request.query_params.get('materia_id')
        if not estudiante_id or not materia_id:
            return Response({'error': 'estudiante_id y materia_id son requeridos'}, 400)
        estudiante = get_object_or_404(Estudiante, pk=estudiante_id)
        historial = self._obtener_historial_asistencias(estudiante, materia_id)
        return Response(historial, 200)
class DocenteViewSet(viewsets.ModelViewSet):
    queryset = Docente.objects.all()
    serializer_class = DocenteSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar_docente(self, request, pk=None):
        try:
            docente = self.get_object()
            usuario = docente.usuario
            usuario.is_active = False
            usuario.save()
            return Response({'status': 'Docente desactivado correctamente'})
        except Docente.DoesNotExist:
            return Response({'error': 'Docente no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='activar')
    def activar_docente(self, request, pk=None):
        try:
            docente = self.get_object()
            usuario = docente.usuario
            usuario.is_active = True
            usuario.save()
            return Response({'status': 'Docente activado correctamente'})
        except Docente.DoesNotExist:
            return Response({'error': 'Docente no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        
class AdministradorViewSet(viewsets.ModelViewSet):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorSerializer
    permission_classes = [permissions.IsAuthenticated]

class SemestreViewSet(viewsets.ModelViewSet):
    queryset = Semestre.objects.all()
    serializer_class = SemestreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        carrera_id = self.request.query_params.get('carrera_id')
        if carrera_id:
            return queryset.filter(carrera_id=carrera_id)
        return queryset

class MateriaViewSet(viewsets.ModelViewSet):
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Materia.objects.all()

class MateriaSemestreViewSet(viewsets.ModelViewSet):
    queryset = MateriaSemestre.objects.all().select_related('materia', 'semestre__carrera')
    serializer_class = MateriaSemestreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if estudiante_id := self.request.query_params.get('estudiante_id'):
            qs = qs.filter(
                semestre__estudiantes_semestre__id=estudiante_id
            ).distinct()
        return qs

    def get_serializer_class(self):
        if self.request.query_params.get('estudiante_id'):
            return MateriaSemestreMiniSerializer  # el que incluye materia.nombre
        return MateriaSemestreSerializer
class DocenteMateriaSemestreViewSet(viewsets.ModelViewSet):
    serializer_class = DocenteMateriaSemestreSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # LÓGICA CORREGIDA:
        # 1. Revisa si el usuario tiene un perfil de Administrador.
        if Administrador.objects.filter(usuario=user).exists():
            # Si tiene un perfil de admin, le mostramos todas las asignaciones.
            return DocenteMateriaSemestre.objects.all().select_related(
                'docente__usuario',
                'materia_semestre__materia',
                'materia_semestre__semestre__carrera'
            )
        
        # 2. Si no es administrador, intentamos encontrar su perfil de Docente.
        try:
            docente = get_object_or_404(Docente, usuario=user)
            return DocenteMateriaSemestre.objects.filter(docente=docente).select_related(
                'docente__usuario',
                'materia_semestre__materia',
                'materia_semestre__semestre__carrera'
            )
        except Docente.DoesNotExist:
            # 3. Si no es ni admin ni docente, no tiene permisos.
            raise PermissionDenied("El usuario no tiene los permisos necesarios.")

    def create(self, request, *args, **kwargs):
        docente_id = request.data.get('docente')
        materia_semestre_data = request.data.get('materia_semestre')

        if not docente_id or not materia_semestre_data:
            return Response(
                {"detail": "Faltan datos requeridos: docente y materia_semestre."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener o crear la instancia de MateriaSemestre según la data anidada
        nombre_materia = materia_semestre_data.get('nombre_materia_a_crear_o_seleccionar')
        semestre_id = materia_semestre_data.get('semestre')
        gestion = materia_semestre_data.get('gestion')
        dia_semana = materia_semestre_data.get('dia_semana')
        hora_inicio = materia_semestre_data.get('hora_inicio')
        hora_fin = materia_semestre_data.get('hora_fin')

        if not all([nombre_materia, semestre_id, gestion, dia_semana, hora_inicio, hora_fin]):
            return Response(
                {"detail": "Datos incompletos en materia_semestre."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar la materia
        from .models import Materia, Semestre, DocenteMateriaSemestre, Docente, MateriaSemestre
        try:
            materia_instance = Materia.objects.get(nombre=nombre_materia)
        except Materia.DoesNotExist:
            materia_instance = Materia.objects.create(nombre=nombre_materia)

        try:
            semestre_instance = Semestre.objects.get(id=semestre_id)
        except Semestre.DoesNotExist:
            return Response(
                {"detail": "Semestre no encontrado."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar o crear MateriaSemestre
        materia_semestre_instance, created = MateriaSemestre.objects.get_or_create(
            materia=materia_instance,
            semestre=semestre_instance,
            gestion=gestion,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin
        )

        # Verificar si la materia_semestre ya está asignada a otro docente
        asignacion_existente = DocenteMateriaSemestre.objects.filter(
            materia_semestre=materia_semestre_instance
        ).exclude(docente_id=docente_id).first()

        if asignacion_existente:
            docente_asignado = asignacion_existente.docente.usuario.get_full_name()
            return Response(
                {"detail": f"La materia '{nombre_materia}' ya está asignada al docente '{docente_asignado}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear la asignación
        try:
            docente_instance = Docente.objects.get(id=docente_id)
        except Docente.DoesNotExist:
            return Response(
                {"detail": "Docente no encontrado."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear la asignación
        asignacion = DocenteMateriaSemestre.objects.create(
            docente=docente_instance,
            materia_semestre=materia_semestre_instance
        )
        serializer = self.get_serializer(asignacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
class SesionClaseViewSet(viewsets.ModelViewSet):
    serializer_class = SesionClaseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtra las sesiones según los permisos del usuario y parámetros de consulta
        """
        user = self.request.user
        queryset = SesionClase.objects.select_related(
            'materia_semestre__materia',
            'materia_semestre__semestre__carrera'
        )

        # Si es administrador, puede ver todas las sesiones
        if Administrador.objects.filter(usuario=user).exists():
            pass  # No aplicar filtros adicionales
        
        # Si es docente, solo puede ver sus sesiones
        elif Docente.objects.filter(usuario=user).exists():
            docente = get_object_or_404(Docente, usuario=user)
            # Filtrar solo las sesiones de las materias asignadas al docente
            materias_docente = DocenteMateriaSemestre.objects.filter(
                docente=docente
            ).values_list('materia_semestre', flat=True)
            queryset = queryset.filter(materia_semestre__in=materias_docente)
        
        # Si es estudiante, puede ver las sesiones de su semestre/carrera
        elif Estudiante.objects.filter(usuario=user).exists():
            estudiante = get_object_or_404(Estudiante, usuario=user)
            queryset = queryset.filter(
                materia_semestre__semestre=estudiante.semestre_actual,
                materia_semestre__semestre__carrera=estudiante.carrera
            )
        else:
            # Si no tiene ningún rol, no puede ver ninguna sesión
            raise PermissionDenied("El usuario no tiene los permisos necesarios.")

        # Aplicar filtros de consulta si existen
        materia_semestre = self.request.query_params.get('materia_semestre')
        if materia_semestre:
            queryset = queryset.filter(materia_semestre=materia_semestre)

        fecha = self.request.query_params.get('fecha')
        if fecha:
            queryset = queryset.filter(fecha=fecha)

        return queryset.order_by('-fecha', '-hora_inicio')

    def create(self, request, *args, **kwargs):
        materia_semestre_id = request.data.get('materia_semestre')

        # Verificar que el docente tiene permiso para crear sesiones en esta materia
        if not DocenteMateriaSemestre.objects.filter(
            docente__usuario=self.request.user,
            materia_semestre__id=materia_semestre_id
        ).exists():
            return Response(
                {"detail": "No tiene permiso para crear sesiones para esta materia."},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            materia_semestre_obj = MateriaSemestre.objects.get(id=materia_semestre_id)

            dia_materia = materia_semestre_obj.dia_semana
            hora_inicio_materia = materia_semestre_obj.hora_inicio
            hora_fin_materia = materia_semestre_obj.hora_fin

            ahora = datetime.now()
            fecha_actual = ahora.date()
            dias_semana_map = {
                0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves',
                4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
            }
            dia_actual_nombre = dias_semana_map.get(ahora.weekday())
            hora_actual = ahora.time()

            # 0. Validación de día especial (feriado o día sin clases)
            if DiaEspecial.es_dia_especial(fecha_actual):
                dia_especial = DiaEspecial.objects.filter(fecha=fecha_actual).first()
                return Response(
                    {"detail": f"No se puede crear sesión en día especial: {dia_especial.get_tipo_display()} - {dia_especial.descripcion}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 1. Validación de día
            if dia_materia != dia_actual_nombre:
                return Response(
                    {"detail": f"No se puede iniciar la sesión. La materia está programada para el día '{dia_materia}', no para hoy '{dia_actual_nombre}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Validación de horario (permitir inicio 15 minutos antes)
            hora_inicio_con_gracia = (datetime.combine(date.min, hora_inicio_materia) - timedelta(minutes=15)).time()

            if not (hora_inicio_con_gracia <= hora_actual < hora_fin_materia):
                return Response(
                    {"detail": f"La sesión de clase solo puede iniciarse entre las {hora_inicio_materia.strftime('%H:%M')} y las {hora_fin_materia.strftime('%H:%M')}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except MateriaSemestre.DoesNotExist:
            return Response(
                {"detail": "La materia seleccionada no es válida."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Establecer los horarios automáticamente
        request.data['hora_inicio'] = hora_inicio_materia
        request.data['hora_fin'] = hora_fin_materia
        request.data['fecha'] = fecha_actual

        # 4. Crear la sesión
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        sesion.save()
        enviar_notificacion_sesion_iniciada(sesion)

    @action(detail=True, methods=['get'], url_path='estudiantes-asistencia')
    def estudiantes_asistencia(self, request, pk=None):
        """
        Obtiene la lista de estudiantes con su estado de asistencia para una sesión específica
        """
        try:
            sesion = self.get_object()
        except SesionClase.DoesNotExist:
            return Response(
                {"detail": "Sesión no encontrada."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar que el usuario tenga permiso para ver esta sesión
        user = request.user
        
        # Si es docente, verificar que esté asignado a esta materia
        if Docente.objects.filter(usuario=user).exists():
            docente = get_object_or_404(Docente, usuario=user)
            if not DocenteMateriaSemestre.objects.filter(
                docente=docente, 
                materia_semestre=sesion.materia_semestre
            ).exists():
                raise PermissionDenied("No tiene permiso para ver esta sesión.")
        
        # Si es administrador, puede ver cualquier sesión (no se aplica filtro)
        elif not Administrador.objects.filter(usuario=user).exists():
            raise PermissionDenied("No tiene permisos para ver esta información.")

        materia_semestre = sesion.materia_semestre
        
        # Obtener estudiantes que deberían estar en esta materia
        # Basado en la carrera y semestre de la materia
        estudiantes = Estudiante.objects.filter(
            carrera=materia_semestre.semestre.carrera,
            semestre_actual=materia_semestre.semestre
        ).select_related('usuario')

        lista_asistencia = []
        for estudiante in estudiantes:
            # Buscar el registro de asistencia para este estudiante en esta sesión
            registro = RegistroAsistencia.objects.filter(
                estudiante=estudiante, 
                sesion=sesion
            ).first()
            
            if registro:
                estado = registro.get_estado_display()
            else:
                # Si no hay registro, se considera como falta
                estado = 'Falta'
            
            if registro:
                ubicacion = f"{registro.latitud}, {registro.longitud}" if registro.latitud and registro.longitud else "No registrada"
            else:
                ubicacion = "No registrada"

            lista_asistencia.append({
                "id": estudiante.id,
                "nombre_completo": estudiante.usuario.get_full_name(),
                "codigo_institucional": estudiante.codigo_institucional,
                "estado": estado,
                "fecha_registro": registro.fecha_registro if registro else None,
                "ubicacion": ubicacion,
            })

        # Ordenar por nombre
        lista_asistencia.sort(key=lambda x: x['nombre_completo'])

        return Response(lista_asistencia, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='generar-pdf-asistencia')
    def generar_pdf_asistencia(self, request, pk=None):
        """
        Genera un PDF con la lista de asistencia de una sesión específica
        """
        try:
            sesion = self.get_object()
        except SesionClase.DoesNotExist:
            return Response(
                {"detail": "Sesión no encontrada."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar permisos (similar al método anterior)
        user = request.user
        if Docente.objects.filter(usuario=user).exists():
            docente = get_object_or_404(Docente, usuario=user)
            if not DocenteMateriaSemestre.objects.filter(
                docente=docente, 
                materia_semestre=sesion.materia_semestre
            ).exists():
                raise PermissionDenied("No tiene permiso para generar este reporte.")
        elif not Administrador.objects.filter(usuario=user).exists():
            raise PermissionDenied("No tiene permisos para generar este reporte.")

        # Crear el PDF en memoria
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=inch, bottomMargin=inch)
        
        # Obtener datos de la sesión
        materia_semestre = sesion.materia_semestre
        materia = materia_semestre.materia
        semestre = materia_semestre.semestre
        carrera = semestre.carrera
        
        # Obtener estudiantes y sus asistencias
        estudiantes = Estudiante.objects.filter(
            carrera=carrera,
            semestre_actual=semestre
        ).select_related('usuario').order_by('usuario__apellido', 'usuario__nombre')
        
        # Preparar contenido del PDF
        elementos = []
        styles = getSampleStyleSheet()

        # Título principal
        titulo_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1,  # Centrado
            textColor=colors.darkblue
        )

        titulo = Paragraph("REPORTE DE ASISTENCIA", titulo_style)
        elementos.append(titulo)
        elementos.append(Spacer(1, 20))

        # Información de la sesión
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=6
        )

        info_data = [
            f"<b>Materia:</b> {materia.nombre}",
            f"<b>Carrera:</b> {carrera.nombre}",
            f"<b>Semestre:</b> {semestre.nombre}",
            f"<b>Gestión:</b> {materia_semestre.gestion}",
            f"<b>Fecha de Sesión:</b> {sesion.fecha.strftime('%d/%m/%Y')}",
            f"<b>Horario:</b> {sesion.hora_inicio.strftime('%H:%M')} - {sesion.hora_fin.strftime('%H:%M')}",
            f"<b>Día:</b> {materia_semestre.dia_semana}",
            f"<b>Tema:</b> {sesion.tema or 'No especificado'}",
            f"<b>Generado el:</b> {datetime.now().strftime('%d/%m/%Y a las %H:%M')}",
        ]

        for info in info_data:
            elementos.append(Paragraph(info, info_style))

        elementos.append(Spacer(1, 20))

        # Tabla de asistencia
        data = [['Nombre', 'Código', 'Estado', 'Ubicación']]

        # Contadores para resumen
        contadores = {'Presente': 0, 'Presente con retraso': 0, 'Falta': 0, 'Falta justificada': 0}

        for estudiante in estudiantes:
            registro = RegistroAsistencia.objects.filter(
                estudiante=estudiante,
                sesion=sesion
            ).first()

            if registro:
                estado = registro.get_estado_display()
                ubicacion = f"{registro.latitud}, {registro.longitud}" if registro.latitud and registro.longitud else "No registrada"
            else:
                estado = 'Falta'
                ubicacion = "No registrada"

            contadores[estado] = contadores.get(estado, 0) + 1

            data.append([
                estudiante.usuario.get_full_name(),
                estudiante.codigo_institucional,
                estado,
                ubicacion
            ])

        # Crear la tabla
        tabla = Table(data, colWidths=[150, 80, 80, 120])  # Ajustar anchos
        tabla.setStyle(TableStyle([
            # Estilo del encabezado
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # Estilo del contenido
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),

            # Colores alternados para las filas
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ]))

        # Aplicar colores según el estado
        for i, estudiante in enumerate(estudiantes, 1):
            registro = RegistroAsistencia.objects.filter(
                estudiante=estudiante,
                sesion=sesion
            ).first()

            if registro:
                estado = registro.get_estado_display()
            else:
                estado = 'Falta'

            if estado == 'Presente':
                tabla.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.lightgreen)]))
            elif estado == 'Presente con retraso':
                tabla.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.yellow)]))
            elif estado == 'Falta justificada':
                tabla.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.lightblue)]))
            elif estado == 'Falta':
                tabla.setStyle(TableStyle([('BACKGROUND', (0, i), (-1, i), colors.lightcoral)]))

        elementos.append(tabla)
        elementos.append(Spacer(1, 30))
        
        # Resumen estadístico
        resumen_titulo = Paragraph("<b>RESUMEN DE ASISTENCIA</b>", titulo_style)
        elementos.append(resumen_titulo)
        elementos.append(Spacer(1, 10))
        
        total_estudiantes = len(estudiantes)
        porcentaje_asistencia = ((contadores['Presente'] + contadores['Presente con retraso']) / total_estudiantes * 100) if total_estudiantes > 0 else 0
        
        resumen_data = [
            ['Estado', 'Cantidad', 'Porcentaje'],
            ['Presente', str(contadores['Presente']), f"{(contadores['Presente']/total_estudiantes*100):.1f}%" if total_estudiantes > 0 else "0%"],
            ['Presente con retraso', str(contadores['Presente con retraso']), f"{(contadores['Presente con retraso']/total_estudiantes*100):.1f}%" if total_estudiantes > 0 else "0%"],
            ['Falta justificada', str(contadores['Falta justificada']), f"{(contadores['Falta justificada']/total_estudiantes*100):.1f}%" if total_estudiantes > 0 else "0%"],
            ['Falta', str(contadores['Falta']), f"{(contadores['Falta']/total_estudiantes*100):.1f}%" if total_estudiantes > 0 else "0%"],
            ['TOTAL', str(total_estudiantes), '100%'],
            ['', '', ''],
            ['Asistencia Efectiva', str(contadores['Presente'] + contadores['Presente con retraso']), f"{porcentaje_asistencia:.1f}%"]
        ]
        
        tabla_resumen = Table(resumen_data)
        tabla_resumen.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -2), 1, colors.black),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elementos.append(tabla_resumen)
        
        # Generar el PDF
        doc.build(elementos)
        
        # Configurar la respuesta HTTP
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        
        # Nombre del archivo
        nombre_archivo = f"asistencia_{materia.nombre.replace(' ', '_')}_{sesion.fecha.strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
        
        return response
    
    


class CredencialQRViewSet(viewsets.ModelViewSet):
    queryset = CredencialQR.objects.all()
    serializer_class = CredencialQRSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='generar-para-estudiante')
    def generar_para_estudiante(self, request):
        estudiante_id = request.data.get('estudiante_id')
        if not estudiante_id:
            return Response(
                {"error": "Se requiere el 'estudiante_id'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        estudiante = get_object_or_404(Estudiante, pk=estudiante_id)

        # Usar get_or_create para evitar duplicados. Si ya existe, la devuelve.
        credencial_qr, created = CredencialQR.objects.get_or_create(estudiante=estudiante)

        # Serializar la credencial para obtener sus datos
        serializer = self.get_serializer(credencial_qr)
        
        # Generar el QR a partir del UUID
        payload = {
        "e": estudiante.id,
        "c": estudiante.codigo_institucional,
        "n": f"{estudiante.usuario.nombre} {estudiante.usuario.apellido}"
        }
        token_a_codificar = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()

        # Genera el QR como imagen PNG
        qr_image = qrcode.make(token_a_codificar)
        
        # Guarda la imagen en un buffer de memoria
        buffer = BytesIO()
        qr_image.save(buffer, format="PNG")
        
        # Codifica la imagen en base64
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        # Devuelve los datos de la credencial y la imagen del QR en base64
        response_data = serializer.data
        response_data["qr_payload"] = token_a_codificar
        response_data['qr_code_base64'] = f"data:image/png;base64,{qr_base64}"
        
        return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PermisoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = PermisoAsistencia.objects.all()
    serializer_class = PermisoAsistenciaSerializer
    permission_classes = [permissions.IsAuthenticated]


def calcular_distancia(lat1, lon1, lat2, lon2):
    R = 6371e3  # Radio de la Tierra en metros
    φ1 = radians(float(lat1))
    φ2 = radians(float(lat2))
    Δφ = radians(float(lat2) - float(lat1))
    Δλ = radians(float(lon2) - float(lon1))
    a = sin(Δφ/2)**2 + cos(φ1) * cos(φ2) * sin(Δλ/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

class RegistroAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = RegistroAsistencia.objects.select_related(
        'sesion__materia_semestre__materia',
        'sesion__materia_semestre__semestre',
        'estudiante__usuario' # También precargamos el usuario del estudiante
    )
    serializer_class = RegistroAsistenciaSerializer
    permission_classes_list = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='registrar-qr')
    @permission_classes([IsEstudiante])
    def registrar_qr(self, request):
        materia_id = request.data.get('materia_id')
        qr_code = request.data.get('qr_code')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        print(f"DEBUG - Solicitud recibida: {request.data}")
        print(f"Coordenadas recibidas: latitude={latitude}, longitude={longitude}")
        print(f"Materia_id recibido: {materia_id}")
        print(f"QR_code recibido: {qr_code}")

        if not materia_id or not qr_code or latitude is None or longitude is None:
            print("Faltan datos requeridos")
            response_data = {'detail': 'materia_id, qr_code, latitude y longitude son requeridos.'}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        # Validar geofence
        GEOFENCE_CENTER = {'latitude': -17.378676, 'longitude': -66.147356}
        GEOFENCE_RADIUS = 500  # 500 metros
        distancia = calcular_distancia(latitude, longitude, GEOFENCE_CENTER['latitude'], GEOFENCE_CENTER['longitude'])
        print(f"Distancia calculada: {distancia} metros")
        print(f"GEOFENCE_CENTER: {GEOFENCE_CENTER}")

        if distancia > GEOFENCE_RADIUS:
            print("Fuera del geofence")
            response_data = {'detail': f'No estás dentro de la institución. Distancia: {distancia:.2f} metros. Acércate al campus.'}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_403_FORBIDDEN)

        try:
            qr_data = json.loads(base64.b64decode(qr_code).decode('utf-8'))
            estudiante_id = qr_data.get('e')
            codigo_institucional = qr_data.get('c')
            print(f"QR decodificado: estudiante_id={estudiante_id}, codigo_institucional={codigo_institucional}")
        except (json.JSONDecodeError, base64.b64decodeError, KeyError) as e:
            print(f"Error al decodificar QR: {str(e)}")
            response_data = {'detail': 'Formato de QR inválido.'}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)

        try:
            estudiante = Estudiante.objects.get(
                usuario=request.user,
                id=estudiante_id,
                codigo_institucional=codigo_institucional
            )
            print(f"Estudiante encontrado: id={estudiante.id}, semestre={estudiante.semestre_actual.id}, carrera={estudiante.carrera.id}")
        except Estudiante.DoesNotExist:
            print("Estudiante no encontrado")
            response_data = {'detail': 'Datos del QR no coinciden con el usuario autenticado.'}
            print(f"Enviando respuesta: {response_data}")
            raise PermissionDenied(response_data['detail'])

        try:
            materia_semestre = MateriaSemestre.objects.get(
                id=materia_id,
                semestre=estudiante.semestre_actual,
                semestre__carrera=estudiante.carrera
            )
            print(f"MateriaSemestre encontrada: id={materia_semestre.id}, materia_id={materia_semestre.materia.id}")
        except MateriaSemestre.DoesNotExist:
            print(f"No se encontró MateriaSemestre para materia_id={materia_id}, semestre_id={estudiante.semestre_actual.id}, carrera_id={estudiante.carrera.id}")
            response_data = {'detail': 'No estás autorizado para esta materia.'}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_403_FORBIDDEN)

        now = timezone.localtime()
        today = now.date()
        current_time = now.time()
        print(f"Buscando sesión: materia_semestre_id={materia_semestre.id}, fecha={today}, hora_actual={current_time}")
        print(f"Zona horaria del servidor: {timezone.get_current_timezone_name()}")

        # Validar si es un día especial
        if DiaEspecial.es_dia_especial(today):
            dia_especial = DiaEspecial.objects.filter(fecha=today).first()
            print(f"Día especial detectado: {dia_especial.get_tipo_display()} - {dia_especial.descripcion}")
            response_data = {
                'detail': f'No se puede registrar asistencia en día especial: {dia_especial.get_tipo_display()} - {dia_especial.descripcion}',
                'tipo_dia_especial': dia_especial.tipo,
                'descripcion': dia_especial.descripcion
            }
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_403_FORBIDDEN)

        try:
            sesion = SesionClase.objects.get(
                materia_semestre=materia_semestre,
                fecha=today,
                hora_inicio__lte=current_time,
                hora_fin__gte=current_time
            )
            print(f"Sesión encontrada: id={sesion.id}, hora_inicio={sesion.hora_inicio}, hora_fin={sesion.hora_fin}")
        except SesionClase.DoesNotExist:
            sesiones = SesionClase.objects.filter(
                materia_semestre=materia_semestre,
                fecha=today
            ).values('id', 'materia_semestre_id', 'fecha', 'hora_inicio', 'hora_fin')
            print(f"No se encontró sesión activa. Sesiones existentes hoy: {list(sesiones)}")
            print(f"DEBUG - Fecha actual: {today}, Hora actual: {current_time}")
            todas_sesiones = SesionClase.objects.filter(materia_semestre=materia_semestre).values('id', 'materia_semestre_id', 'fecha', 'hora_inicio', 'hora_fin')
            print(f"Todas las sesiones para materia_semestre_id={materia_semestre.id}: {list(todas_sesiones)}")
            response_data = {
                'detail': 'No hay una sesión activa para esta materia.',
                'sesiones_hoy': list(sesiones),
                'hora_actual': str(current_time),
                'fecha_actual': str(today)
            }
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_404_NOT_FOUND)

        if RegistroAsistencia.objects.filter(estudiante=estudiante, sesion=sesion).exists():
            print("Asistencia ya registrada")
            response_data = {'detail': 'Ya has registrado tu asistencia para esta sesión.'}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_409_CONFLICT)

        serializer = RegistroAsistenciaSerializer(data={
            'estudiante': estudiante.id,
            'sesion': sesion.id,
            'permiso_asistencia_id': None,
            'latitud': latitude,
            'longitud': longitude,
        })

        if serializer.is_valid():
            registro = serializer.save()
            print(f"Asistencia registrada: id={registro.id}, estado={registro.get_estado_display()}")
            print(f"DEBUG - Hora actual: {current_time}")
            print(f"DEBUG - Hora inicio sesión: {sesion.hora_inicio}")
            print(f"DEBUG - Hora fin sesión: {sesion.hora_fin}")
            print(f"DEBUG - Fecha registro: {registro.fecha_registro}")
            print(f"DEBUG - Ubicación: lat={registro.latitud}, lon={registro.longitud}")
            response_data = {
                'detail': 'Asistencia registrada con éxito.',
                'materia_nombre': sesion.materia_semestre.materia.nombre,
                'estado': registro.get_estado_display(),
            }
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            print(f"Error en serializer: {serializer.errors}")
            response_data = {'detail': 'Error al registrar asistencia.', 'errors': serializer.errors}
            print(f"Enviando respuesta: {response_data}")
            return Response(response_data, status=status.HTTP_400_BAD_REQUEST)
        
    def get_queryset(self):
        queryset = super().get_queryset()
        estudiante_id = self.request.query_params.get('estudiante_id')
        if estudiante_id:
            queryset = queryset.filter(estudiante_id=estudiante_id)
        return queryset
            
class ReporteViewSet(viewsets.ModelViewSet):
    queryset = Reporte.objects.all()
    serializer_class = ReporteSerializer
    permission_classes = [permissions.IsAuthenticated]

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generar_reporte_asistencia(request):
    """
    Genera un reporte de asistencia en PDF para una sesión específica
    """
    try:
        # Verificar que el usuario es docente
        if not hasattr(request.user, 'docente_perfil'):
            return Response({'error': 'Solo los docentes pueden generar reportes'}, status=status.HTTP_403_FORBIDDEN)
        
        docente = request.user.docente_perfil
        sesion_id = request.data.get('sesion_id')
        
        if not sesion_id:
            return Response({'error': 'Se requiere el ID de la sesión'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener la sesión y verificar que pertenece al docente
        try:
            sesion = SesionClase.objects.select_related(
                'materia_semestre__materia',
                'materia_semestre__semestre__carrera'
            ).get(id=sesion_id)
            
            # Verificar que el docente tiene asignada esta materia
            if not DocenteMateriaSemestre.objects.filter(
                docente=docente,
                materia_semestre=sesion.materia_semestre
            ).exists():
                return Response({'error': 'No tienes permisos para esta materia'}, status=status.HTTP_403_FORBIDDEN)
                
        except SesionClase.DoesNotExist:
            return Response({'error': 'Sesión no encontrada'}, status=status.HTTP_404_NOT_FOUND)
        
        # Obtener las asistencias de la sesión
        asistencias = RegistroAsistencia.objects.filter(
            sesion=sesion
        ).select_related(
            'estudiante__usuario',
            'estudiante__carrera'
        ).order_by('estudiante__usuario__apellido', 'estudiante__usuario__nombre')
        
        # Generar el PDF
        pdf_buffer = generar_pdf_asistencia(sesion, asistencias)
        
        # Crear el registro del reporte
        reporte = Reporte.objects.create(
            generado_por_docente=docente,
            tipo_reporte=f"Reporte de Asistencia - {sesion.materia_semestre.materia.nombre}",
            parametros_generacion={
                'sesion_id': sesion_id,
                'fecha_sesion': sesion.fecha.isoformat(),
                'materia': sesion.materia_semestre.materia.nombre,
                'carrera': sesion.materia_semestre.semestre.carrera.nombre,
                'semestre': sesion.materia_semestre.semestre.nombre,
                'total_estudiantes': asistencias.count()
            }
        )
        pdf_buffer = generar_pdf_asistencia(sesion, asistencias)
        reporte.archivo_pdf.save(f"reporte_{reporte.id}.pdf", ContentFile(pdf_buffer.getvalue()))
        reporte.save()
        # Crear respuesta con el PDF
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="reporte_asistencia_{sesion.fecha}_{sesion.materia_semestre.materia.nombre}.pdf"'
        
        return response
        
    except Exception as e:
        print(f"Error al generar reporte: {e}")
        return Response({'error': 'Error interno del servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def generar_pdf_asistencia(sesion, asistencias):
    """
    Genera un PDF con la información de asistencia
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=1  # Centrado
    )

    # Título del reporte
    elements.append(Paragraph("REPORTE DE ASISTENCIA", title_style))
    elements.append(Spacer(1, 20))

    # Información de la sesión
    info_data = [
        ['Materia:', sesion.materia_semestre.materia.nombre],
        ['Carrera:', sesion.materia_semestre.semestre.carrera.nombre],
        ['Semestre:', sesion.materia_semestre.semestre.nombre],
        ['Fecha:', sesion.fecha.strftime('%d/%m/%Y')],
        ['Hora:', f"{sesion.hora_inicio} - {sesion.hora_fin}"],
        ['Tema:', sesion.tema or 'No especificado']
    ]

    info_table = Table(info_data, colWidths=[100, 300])
    info_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Obtener todos los estudiantes de la materia
    materia_semestre = sesion.materia_semestre
    estudiantes = Estudiante.objects.filter(
        carrera=materia_semestre.semestre.carrera,
        semestre_actual=materia_semestre.semestre
    ).select_related('usuario').order_by('usuario__apellido', 'usuario__nombre')

    # Tabla de asistencias
    data = [['Nombre', 'Código', 'Estado', 'Ubicación']]

    # Contadores para resumen
    contadores = {'Presente': 0, 'Presente con retraso': 0, 'Falta': 0, 'Falta justificada': 0}

    for estudiante in estudiantes:
        # Buscar registro de asistencia
        registro = asistencias.filter(estudiante=estudiante).first()

        if registro:
            estado = registro.get_estado_display()
            ubicacion = f"{registro.latitud}, {registro.longitud}" if registro.latitud and registro.longitud else "No registrada"
        else:
            estado = 'Falta'
            ubicacion = "No registrada"

        contadores[estado] = contadores.get(estado, 0) + 1

        data.append([
            estudiante.usuario.get_full_name(),
            estudiante.codigo_institucional,
            estado,
            ubicacion
        ])

    # Crear tabla
    table = Table(data, colWidths=[150, 80, 80, 120])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Nombres alineados a la izquierda
        ('ALIGN', (3, 1), (3, -1), 'LEFT'),  # Ubicación alineada a la izquierda
    ]))

    elements.append(table)
    elements.append(Spacer(1, 20))

    # Resumen estadístico
    total_estudiantes = len(estudiantes)
    resumen_data = [
        ['Total Estudiantes:', str(total_estudiantes)],
        ['Presentes:', str(contadores.get('Presente', 0))],
        ['Presentes con retraso:', str(contadores.get('Presente con retraso', 0))],
        ['Faltas justificadas:', str(contadores.get('Falta justificada', 0))],
        ['Faltas:', str(contadores.get('Falta', 0))]
    ]

    resumen_table = Table(resumen_data, colWidths=[150, 100])
    resumen_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(resumen_table)

    # Generar PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_reportes_admin(request):
    """
    Lista todos los reportes para que los vea el administrador
    """
    try:
        # Verificar que el usuario es administrador
        if not hasattr(request.user, 'administrador_perfil'):
            return Response({'error': 'Solo los administradores pueden ver esta información'}, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener todos los reportes ordenados por fecha de generación
        reportes = Reporte.objects.select_related(
            'generado_por_docente__usuario',
            'generado_por_administrador__usuario'
        ).order_by('-fecha_generacion')
        
        # Serializar los datos
        data = []
        for reporte in reportes:
            generador = ""
            if reporte.generado_por_docente:
                generador = f"Docente: {reporte.generado_por_docente.usuario.get_full_name()}"
            elif reporte.generado_por_administrador:
                generador = f"Admin: {reporte.generado_por_administrador.usuario.get_full_name()}"
            
            data.append({
                'id': reporte.id,
                'tipo_reporte': reporte.tipo_reporte,
                'fecha_generacion': reporte.fecha_generacion,
                'generado_por': generador,
                'parametros': reporte.parametros_generacion
            })
        
        return Response(data)
        
    except Exception as e:
        print(f"Error al listar reportes: {e}")
        return Response({'error': 'Error interno del servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MisMateriasListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MisMateriasSerializer

    def get_queryset(self):
        # --- LÍNEA DE DIAGNÓSTICO ---
        print(f"Usuario autenticado: {self.request.user.email}")
        print(f"Tipo de objeto de usuario: {type(self.request.user)}")
        # -----------------------------

        try:
            docente_perfil = get_object_or_404(Docente, usuario=self.request.user)
        except Docente.DoesNotExist:
            raise PermissionDenied("No se encontró un perfil de docente para el usuario actual.")

        # Si llegamos a este punto, significa que el perfil de Docente se encontró correctamente.
        # Ahora, filtramos las materias asignadas a ese docente.
        return DocenteMateriaSemestre.objects.filter(docente=docente_perfil)

class MisMateriasConEstudiantesListView(generics.ListAPIView):
    serializer_class = MisMateriasConEstudiantesSerializer  # <-- nuevo
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            docente = get_object_or_404(Docente, usuario=user)
        except Docente.DoesNotExist:
            raise PermissionDenied("No se encontró un perfil de docente.")
        return DocenteMateriaSemestre.objects.filter(docente=docente).select_related(
            'materia_semestre__materia',
            'materia_semestre__semestre__carrera'
        ).prefetch_related(
            Prefetch(
                'materia_semestre__inscripciones',
                queryset=Inscripcion.objects.select_related('estudiante__usuario')
            )
        )
    
class InscripcionViewSet(viewsets.ModelViewSet):
    queryset = Inscripcion.objects.select_related('estudiante__usuario', 'materia_semestre__materia')
    serializer_class = InscripcionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            return InscripcionCreateSerializer
        return InscripcionSerializer

class MisMateriasEstudianteView(generics.ListAPIView):
    serializer_class = MateriaEstudianteSerializer
    permission_classes = [IsEstudiante]

    def get_queryset(self):
        estudiante = Estudiante.objects.get(usuario=self.request.user)
        print(f"Estudiante: id={estudiante.id}, semestre={estudiante.semestre_actual.nombre}, carrera={estudiante.carrera.nombre}")
        queryset = MateriaSemestre.objects.filter(
            semestre=estudiante.semestre_actual,
            semestre__carrera=estudiante.carrera,
        ).filter(
            Exists(
                DocenteMateriaSemestre.objects.filter(
                    materia_semestre=OuterRef('pk')
                )
            )
        ).select_related(
            'materia', 'semestre__carrera'
        ).prefetch_related(
            'docentes_asignados__docente__usuario'
        )
        print(f"Materias encontradas: {queryset.values('id', 'materia__nombre', 'semestre__nombre', 'semestre__carrera__nombre')}")
        return queryset
    
@api_view(['GET'])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})

@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    csrf_token = get_token(request)
    return Response({'csrfToken': csrf_token})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def descargar_reporte_pdf(request, reporte_id):
    """
    Permite al administrador descargar un reporte PDF previamente generado
    """
    if not hasattr(request.user, 'administrador_perfil'):
        return Response({'error': 'No autorizado'}, status=status.HTTP_403_FORBIDDEN)

    reporte = get_object_or_404(Reporte, id=reporte_id)

    if not reporte.archivo_pdf or not reporte.archivo_pdf.storage.exists(reporte.archivo_pdf.name):
        raise Http404("Reporte no encontrado o sin archivo adjunto")

    response = HttpResponse(reporte.archivo_pdf.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="reporte_{reporte.id}.pdf"'
    return response

@api_view(['GET'])
@permission_classes([IsAdministrador])
def resumen_asistencias_general(request):
    """
    Devuelve el resumen general de asistencias por materia para todos los estudiantes.
    Incluye todas las materias, incluso si no tienen sesiones o asistencias.
    Soporta filtros por carrera y semestre.
    Solo accesible para administradores.
    """
    try:
        # Obtener parámetros de filtro
        carrera_id = request.query_params.get('carrera_id')
        semestre_id = request.query_params.get('semestre_id')

        # Obtener todas las materias o filtrar según parámetros
        if carrera_id and semestre_id:
            # Filtrar por carrera y semestre específicos
            materias = Materia.objects.filter(
                materias_por_semestre__semestre__carrera_id=carrera_id,
                materias_por_semestre__semestre_id=semestre_id
            ).distinct()
        elif carrera_id:
            # Filtrar solo por carrera
            materias = Materia.objects.filter(
                materias_por_semestre__semestre__carrera_id=carrera_id
            ).distinct()
        elif semestre_id:
            # Filtrar solo por semestre
            materias = Materia.objects.filter(
                materias_por_semestre__semestre_id=semestre_id
            ).distinct()
        else:
            # Obtener todas las materias
            materias = Materia.objects.all()

        resumen_general = []

        for materia in materias:
            # Obtener todas las sesiones de esta materia
            sesiones = SesionClase.objects.filter(
                materia_semestre__materia=materia
            )
            total_sesiones = sesiones.count()

            # Obtener todos los estudiantes que deberían tener esta materia
            estudiantes_relevantes = Estudiante.objects.filter(
                semestre_actual__materias_ofrecidas__materia=materia
            ).distinct()
            total_estudiantes = estudiantes_relevantes.count()

            # Calcular asistencias totales
            asistencias_totales = RegistroAsistencia.objects.filter(
                sesion__in=sesiones,
                estado__in=['PRESENTE', 'RETRASO']
            ).count()

            # Calcular porcentaje general
            if total_estudiantes == 0 or total_sesiones == 0:
                porcentaje_general = 0
            else:
                porcentaje_general = (asistencias_totales / (total_sesiones * total_estudiantes)) * 100

            # Obtener información de carrera, semestre y docente para esta materia
            materia_semestre_info = MateriaSemestre.objects.filter(
                materia=materia
            ).select_related(
                'semestre__carrera'
            ).prefetch_related(
                'docentes_asignados__docente__usuario'
            ).order_by('-semestre__nombre').first()

            carrera_nombre = "N/A"
            semestre_nombre = "N/A"
            docente_nombre = "N/A"

            if materia_semestre_info:
                carrera_nombre = materia_semestre_info.semestre.carrera.nombre
                semestre_nombre = materia_semestre_info.semestre.nombre
                docentes = materia_semestre_info.docentes_asignados.all()
                if docentes.exists():
                    docente_nombre = docentes[0].docente.usuario.get_full_name()

            resumen_general.append({
                'materia_id': materia.id,
                'materia_nombre': materia.nombre,
                'carrera_nombre': carrera_nombre,
                'semestre_nombre': semestre_nombre,
                'docente_nombre': docente_nombre,
                'total_sesiones': total_sesiones,
                'total_estudiantes': total_estudiantes,
                'asistencias_totales': asistencias_totales,
                'porcentaje_asistencia_general': round(porcentaje_general, 2),
            })

        # Ordenar por porcentaje de asistencia (menor a mayor)
        resumen_general.sort(key=lambda x: x['porcentaje_asistencia_general'])

        return Response(resumen_general, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error al calcular resumen general: {e}")
        return Response({'error': 'Error interno del servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def enviar_notificacion_prueba(request):
    token = request.data.get('token')
    if not token:
        return Response({'error': 'Falta token'}, status=400)

    try:
        PushClient().publish(
            PushMessage(
                to=token,
                title="Clase iniciada",
                body="Tu clase ha comenzado."
            )
        )
        return Response({'status': 'notificación enviada'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAdministrador])
def get_filtros_asistencia(request):
    """
    Devuelve las opciones disponibles para filtrar el resumen de asistencias.
    Solo accesible para administradores.
    """
    try:
        # Obtener todas las carreras que tienen materias
        from django.db.models import Exists, OuterRef
        carreras = Carrera.objects.filter(
            Exists(MateriaSemestre.objects.filter(semestre__carrera=OuterRef('pk')))
        ).distinct().values('id', 'nombre')

        # Obtener todos los semestres que tienen materias
        semestres = Semestre.objects.filter(
            Exists(MateriaSemestre.objects.filter(semestre=OuterRef('pk')))
        ).distinct().select_related('carrera').values(
            'id', 'nombre', 'carrera__id', 'carrera__nombre'
        )

        return Response({
            'carreras': list(carreras),
            'semestres': list(semestres)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"Error al obtener filtros: {e}")
        return Response({'error': 'Error interno del servidor'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DiaEspecialViewSet(viewsets.ModelViewSet):
    serializer_class = DiaEspecialSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrador]
    queryset = DiaEspecial.objects.all().select_related('creado_por__usuario')

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filtros opcionales
        fecha_inicio = self.request.query_params.get('fecha_inicio')
        fecha_fin = self.request.query_params.get('fecha_fin')
        tipo = self.request.query_params.get('tipo')

        if fecha_inicio and fecha_fin:
            queryset = queryset.filter(fecha__gte=fecha_inicio, fecha__lte=fecha_fin)
        elif fecha_inicio:
            queryset = queryset.filter(fecha__gte=fecha_inicio)
        elif fecha_fin:
            queryset = queryset.filter(fecha__lte=fecha_fin)

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset.order_by('-fecha')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        fecha_str = data.get('fecha')
        if fecha_str:
            try:
                # Parse the date string to date object
                # Since TIME_ZONE is set to 'America/La_Paz', the date is interpreted in Bolivia's timezone
                data['fecha'] = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except Exception as e:
                return Response({'error': f'Fecha inválida: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'], url_path='verificar-fecha', permission_classes=[permissions.IsAuthenticated])
    def verificar_fecha(self, request):
        """
        Verifica si una fecha específica es un día especial
        URL: /api/dias-especiales/verificar-fecha/?fecha=2024-12-25
        """
        fecha_str = request.query_params.get('fecha')
        if not fecha_str:
            return Response(
                {'error': 'Se requiere el parámetro fecha'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )

        es_especial = DiaEspecial.es_dia_especial(fecha)
        dia_especial = None

        if es_especial:
            dia_especial = DiaEspecial.objects.filter(fecha=fecha).first()
            serializer = self.get_serializer(dia_especial)
            dia_especial = serializer.data

        return Response({
            'fecha': fecha_str,
            'es_dia_especial': es_especial,
            'dia_especial': dia_especial
        })
    
