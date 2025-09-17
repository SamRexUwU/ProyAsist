from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
import uuid
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile


class UsuarioManager(BaseUserManager):
    def create_user(self, email, nombre, apellido, password=None):
        if not email:
            raise ValueError('El usuario debe tener un email')
        email = self.normalize_email(email)
        usuario = self.model(email=email, nombre=nombre, apellido=apellido)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, nombre, apellido, password):
        usuario = self.create_user(email, nombre, apellido, password)
        usuario.is_superuser = True
        usuario.is_staff = True
        usuario.save(using=self._db)
        return usuario

class Usuario(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    objects = UsuarioManager()

    class Meta:
        verbose_name = "Usuario del Sistema"
        verbose_name_plural = "Usuarios del Sistema"
        # db_table = 'usuario_sistema' # Opcional: si quieres un nombre de tabla específico
        
    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.email})'

    def get_full_name(self):
        return f'{self.nombre} {self.apellido}'

    def get_short_name(self):
        return self.nombre

class Carrera(models.Model):
    # Django automáticamente añade un campo 'id' como clave primaria autoincremental
    nombre = models.CharField(max_length=100, unique=True)
    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Semestre(models.Model):
    # Django automáticamente añade un campo 'id'
    # CAMBIO SUGERIDO AQUÍ: Quitado unique=True global.
    nombre = models.CharField(max_length=20) # Ej. "2025-1", "Verano 2024"
    carrera = models.ForeignKey(Carrera, on_delete=models.PROTECT, related_name='semestres_carrera') 

    class Meta:
        verbose_name = "Semestre"
        verbose_name_plural = "Semestres"
        ordering = ['carrera__nombre', 'nombre'] # Ordenar por carrera y luego por nombre de semestre
        # CAMBIO SUGERIDO AQUÍ: Añadido unique_together para que el nombre sea único por carrera.
        unique_together = ('nombre', 'carrera')

    def __str__(self):
        return f'{self.nombre} ({self.carrera.nombre})'

class Materia(models.Model):
    # Django automáticamente añade un campo 'id'
    nombre = models.CharField(max_length=150, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Materia"
        verbose_name_plural = "Materias"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Estudiante(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='estudiante_perfil')
    codigo_institucional = models.CharField(max_length=50, unique=True)
    carrera = models.ForeignKey(Carrera, on_delete=models.PROTECT, related_name='estudiantes_carrera')
    semestre_actual = models.ForeignKey(Semestre, on_delete=models.PROTECT, related_name='estudiantes_semestre') # Renombrado para claridad

    class Meta:
        verbose_name = "Estudiante"
        verbose_name_plural = "Estudiantes"
        ordering = ['usuario__apellido', 'usuario__nombre'] # Ordenar por nombre del usuario asociado

    def __str__(self):
        return self.usuario.get_full_name() # Uso del método get_full_name del Usuario

class Docente(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='docente_perfil')
    especialidad = models.CharField(max_length=100, blank=True, null=True) # Puede ser opcional

    class Meta:
        verbose_name = "Docente"
        verbose_name_plural = "Docentes"
        ordering = ['usuario__apellido', 'usuario__nombre']

    def __str__(self):
        return f'Docente: {self.usuario.get_full_name()}'

class Administrador(models.Model):
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='administrador_perfil')
    cargo = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        verbose_name = "Administrador"
        verbose_name_plural = "Administradores"
        ordering = ['usuario__apellido', 'usuario__nombre']

    def __str__(self):
        return f'Admin: {self.usuario.get_full_name()}'

class MateriaSemestre(models.Model):
    materia = models.ForeignKey(Materia, on_delete=models.CASCADE, related_name='materias_por_semestre')
    semestre = models.ForeignKey(Semestre, on_delete=models.CASCADE, related_name='materias_ofrecidas')
    gestion = models.CharField(max_length=10)  # Ejemplo: "2025/1", "II-2024"
    dia_semana = models.CharField(max_length=10)  # "lunes", "martes", etc.
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    class Meta:
        verbose_name = "Materia por Semestre"
        verbose_name_plural = "Materias por Semestre"
        # Asegurar que una materia no se ofrezca en el mismo semestre, gestión y hora de inicio con el mismo día
        unique_together = ('materia', 'semestre', 'gestion', 'hora_inicio', 'hora_fin')
        ordering = ['semestre', 'materia__nombre', 'dia_semana', 'hora_inicio']


    def __str__(self):
        return f'{self.materia.nombre} - {self.semestre.nombre} ({self.gestion}) - {self.dia_semana} {self.hora_inicio}-{self.hora_fin}'

class DocenteMateriaSemestre(models.Model):
    docente = models.ForeignKey(Docente, on_delete=models.CASCADE, related_name='asignaciones')
    materia_semestre = models.ForeignKey(MateriaSemestre, on_delete=models.CASCADE, related_name='docentes_asignados')

    class Meta:
        verbose_name = "Asignación Docente-Materia-Semestre"
        verbose_name_plural = "Asignaciones Docente-Materia-Semestre"
        unique_together = ('docente', 'materia_semestre') # Un docente solo se asigna una vez a la misma materia_semestre
        ordering = ['docente__usuario__apellido', 'materia_semestre__materia__nombre']

    def __str__(self):
        return f'{self.docente.usuario.get_full_name()} asignado a {self.materia_semestre}'

class SesionClase(models.Model):
    materia_semestre = models.ForeignKey(MateriaSemestre, on_delete=models.CASCADE, related_name='sesiones_clase')
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tema = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        verbose_name = "Sesión de Clase"
        verbose_name_plural = "Sesiones de Clase"
        unique_together = ('materia_semestre', 'fecha')
        ordering = ['fecha', 'hora_inicio']

    def __str__(self):
        return f'Sesión de {self.materia_semestre} el {self.fecha} de {self.hora_inicio} a {self.hora_fin}'

class CredencialQR(models.Model):
    estudiante = models.OneToOneField(Estudiante, on_delete=models.CASCADE, related_name='credencial_qr')
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True) # UUID es un identificador único universal
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Credencial QR"
        verbose_name_plural = "Credenciales QR"
        ordering = ['estudiante__usuario__apellido']

    def __str__(self):
        return f'QR de {self.estudiante.usuario.get_full_name()} ({self.uuid})'

class PermisoAsistencia(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='permisos_enviados')
    administrador_aprobador = models.ForeignKey( # Quién aprueba (puede ser nulo si está pendiente o no aprobado)
        Administrador,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='permisos_aprobados_por'
    )
    motivo = models.TextField()
    archivo_justificacion = models.FileField(upload_to='permisos/', null=True, blank=True)
    
    ESTADO_CHOICES = (
        ('PENDIENTE', 'Pendiente'),
        ('APROBADO', 'Aprobado'),
        ('RECHAZADO', 'Rechazado'),
    )
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin = models.DateField(null=True, blank=True) 

    sesiones_cubiertas = models.ManyToManyField(
        'SesionClase',
        related_name='permisos_otorgados',
        blank=True # Un permiso puede crearse sin sesiones asignadas inicialmente
    )
    
    class Meta:
        verbose_name = "Permiso de Asistencia"
        verbose_name_plural = "Permisos de Asistencia"
        ordering = ['-fecha_solicitud']

    def __str__(self):
        return f'Permiso de {self.estudiante.usuario.get_full_name()} ({self.estado}) desde {self.fecha_inicio}'


class RegistroAsistencia(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE, related_name='registros')
    sesion = models.ForeignKey(SesionClase, on_delete=models.CASCADE, related_name='registros_sesion')
    fecha_registro = models.DateTimeField(auto_now_add=True) # Momento exacto del registro
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # **Campo para almacenar el estado de la asistencia**
    ESTADO_CHOICES = (
        ('PRESENTE', 'Presente'),
        ('RETRASO', 'Presente con retraso'),
        ('FALTA', 'Falta'),
        ('FALTA_JUSTIFICADA', 'Falta justificada'),
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='FALTA')

    # **Relación N -- 0..1 con PermisoAsistencia**
    permiso_asistencia = models.ForeignKey(
        'PermisoAsistencia',
        on_delete=models.SET_NULL, # Si el permiso se borra, el registro no se borra, solo se anula la justificación
        null=True, blank=True,    # Puede ser nulo (no todos los registros tienen un permiso asociado)
        related_name='registros_asociados'
    )

    class Meta:
        verbose_name = "Registro de Asistencia"
        verbose_name_plural = "Registros de Asistencia"
        # Un estudiante solo puede tener un registro por sesión de clase
        unique_together = ('estudiante', 'sesion')
        ordering = ['-fecha_registro']

    # Método para calcular el estado, útil para establecer el campo 'estado'
    # tolerancia_minutos=15: El estudiante puede registrarse hasta 15 minutos después
    # de que inicie la sesión y se considerará "PRESENTE", después será "RETRASO"
    def _calcular_estado_asistencia_basado_en_hora(self, tolerancia_minutos=15):
        # La hora de inicio programada está en la sesión específica
        hora_inicio_sesion = self.sesion.hora_inicio
        
        # Combinar fecha de la sesión con hora de inicio programada
        # Crear un datetime naive (sin zona horaria) para la hora programada
        dt_hora_programada = datetime.combine(self.sesion.fecha, hora_inicio_sesion)
        
        # Convertir fecha_registro a la zona horaria local para comparación correcta
        from django.utils import timezone
        if hasattr(self.fecha_registro, 'astimezone'):
            # Si tiene zona horaria, convertir a la zona horaria local del servidor
            dt_hora_registro = self.fecha_registro.astimezone(timezone.get_current_timezone())
            # Extraer solo la fecha y hora sin zona horaria para comparar
            dt_hora_registro = datetime.combine(
                dt_hora_registro.date(), 
                dt_hora_registro.time()
            )
        else:
            # Si no tiene zona horaria, usar directamente
            dt_hora_registro = self.fecha_registro

        # Calcular la diferencia en minutos
        diferencia_segundos = (dt_hora_registro - dt_hora_programada).total_seconds()
        diferencia_minutos = diferencia_segundos / 60

        print(f"DEBUG - Hora inicio sesión: {hora_inicio_sesion}")
        print(f"DEBUG - Fecha sesión: {self.sesion.fecha}")
        print(f"DEBUG - Hora registro (local): {dt_hora_registro}")
        print(f"DEBUG - Hora registro (original): {self.fecha_registro}")
        print(f"DEBUG - Diferencia en minutos: {diferencia_minutos}")
        print(f"DEBUG - Tolerancia: {tolerancia_minutos}")

        if diferencia_minutos <= tolerancia_minutos:
            return "PRESENTE"
        else:
            return "RETRASO"
            
    # Método para actualizar el campo 'estado' basado en diferentes criterios
    def set_estado_asistencia(self):
        # Primero, verifica si hay un permiso asociado que cubra esta sesión
        if self.permiso_asistencia:
            # Si el permiso está APROBADO y cubre la fecha de la sesión
            # (aquí se podría añadir lógica para verificar que la sesión.fecha esté entre
            #  permiso_asistencia.fecha_inicio y fecha_fin, y que la sesión esté en sesiones_cubiertas)
            # Simplificado por ahora: si hay un permiso y está aprobado.
            if self.permiso_asistencia.estado == 'APROBADO' and self.sesion in self.permiso_asistencia.sesiones_cubiertas.all():
                self.estado = 'FALTA_JUSTIFICADA'
                return

        # Si no hay permiso o no lo cubre/aprueba, calcula el estado basado en el registro
        if self.fecha_registro: # Si hay un registro real
            try:
                self.estado = self._calcular_estado_asistencia_basado_en_hora()
                print(f"Estado calculado: {self.estado} para registro {self.id}")
            except Exception as e:
                print(f"Error al calcular estado: {e}")
                # Si hay error en el cálculo, por defecto es PRESENTE ya que hay registro
                self.estado = 'PRESENTE'
        else: # Si no hay registro y no hay permiso aprobado que lo justifique
            self.estado = 'FALTA'
        
        # Guardar automáticamente el estado calculado
        self.save(update_fields=['estado'])

    def __str__(self):
        return f'{self.estudiante.usuario.get_full_name()} - {self.sesion.materia_semestre.materia.nombre} ({self.sesion.fecha}): {self.estado}'
    
    def get_info_debug(self):
        """Método para debuggear la información de tiempo"""
        hora_inicio_sesion = self.sesion.hora_inicio
        dt_hora_programada = datetime.combine(self.sesion.fecha, hora_inicio_sesion)
        
        # Usar la misma lógica que el método principal
        from django.utils import timezone
        if hasattr(self.fecha_registro, 'astimezone'):
            dt_hora_registro = self.fecha_registro.astimezone(timezone.get_current_timezone())
            dt_hora_registro = datetime.combine(
                dt_hora_registro.date(), 
                dt_hora_registro.time()
            )
        else:
            dt_hora_registro = self.fecha_registro
        
        diferencia_segundos = (dt_hora_registro - dt_hora_programada).total_seconds()
        diferencia_minutos = diferencia_segundos / 60
        
        return {
            'hora_inicio_sesion': hora_inicio_sesion,
            'fecha_sesion': self.sesion.fecha,
            'fecha_registro': self.fecha_registro,
            'fecha_registro_local': dt_hora_registro,
            'diferencia_minutos': diferencia_minutos,
            'estado_actual': self.estado,
            'estado_calculado': self._calcular_estado_asistencia_basado_en_hora()
        }


class Reporte(models.Model):
    generado_por_docente = models.ForeignKey(
        Docente,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reportes_docente'
    )
    generado_por_administrador = models.ForeignKey(
        Administrador,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reportes_administrador'
    )

    tipo_reporte = models.CharField(max_length=100)
    fecha_generacion = models.DateTimeField(auto_now_add=True)
    parametros_generacion = models.JSONField(null=True, blank=True)

    # 👇 Cambio clave: FileField en lugar de URLField
    archivo_pdf = models.FileField(upload_to='reportes/', blank=True, null=True)

    def __str__(self):
        generador = "Desconocido"
        if self.generado_por_docente:
            generador = f"Docente: {self.generado_por_docente.usuario.get_full_name()}"
        elif self.generado_por_administrador:
            generador = f"Admin: {self.generado_por_administrador.usuario.get_full_name()}"
        return f'Reporte "{self.tipo_reporte}" ({generador})'

    def generar_y_guardar_reporte(self, pdf_buffer, **kwargs):
        """
        Guarda el PDF generado en el campo archivo_pdf
        """
        filename = f"reporte_{self.id}_{self.tipo_reporte.replace(' ', '_')}.pdf"
        self.archivo_pdf.save(filename, ContentFile(pdf_buffer.getvalue()))
        self.parametros_generacion = kwargs
        self.save()
        
class Inscripcion(models.Model):
    estudiante = models.ForeignKey(Estudiante, on_delete=models.CASCADE)
    materia_semestre = models.ForeignKey(MateriaSemestre, on_delete=models.CASCADE, related_name="inscripciones")
    fecha_inscripcion = models.DateField(auto_now_add=True)

    class Meta:
        unique_together = ('estudiante', 'materia_semestre')

    def __str__(self):
        return f"{self.estudiante} inscrito en {self.materia_semestre}"

class DiaEspecial(models.Model):
    fecha = models.DateField(unique=True)
    tipo = models.CharField(max_length=20, choices=[
        ('FERIADO', 'Feriado'),
        ('SIN_CLASES', 'Día sin clases'),
        ('SUSPENSION', 'Suspensión de actividades')
    ])
    descripcion = models.CharField(max_length=200)
    afecta_asistencia = models.BooleanField(default=True)
    creado_por = models.ForeignKey(Administrador, on_delete=models.SET_NULL, null=True, blank=True, related_name='dias_especiales_creados')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Día Especial"
        verbose_name_plural = "Días Especiales"
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.fecha} - {self.get_tipo_display()}: {self.descripcion}"

    @staticmethod
    def es_dia_especial(fecha):
        """Verifica si una fecha es un día especial que afecta asistencia"""
        return DiaEspecial.objects.filter(
            fecha=fecha,
            afecta_asistencia=True
        ).exists()

    @staticmethod
    def get_dias_especiales_rango(fecha_inicio, fecha_fin):
        """Obtiene todos los días especiales en un rango de fechas"""
        return DiaEspecial.objects.filter(
            fecha__gte=fecha_inicio,
            fecha__lte=fecha_fin,
            afecta_asistencia=True
        ).values_list('fecha', flat=True)
