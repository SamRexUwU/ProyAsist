from django.urls import path, include # Asegúrate de importar include
from rest_framework.routers import DefaultRouter # Importa DefaultRouter
from .views import (
    UsuarioViewSet, # Ahora es un ViewSet
    login_view, logout_view,
    CarreraViewSet, EstudianteViewSet, DocenteViewSet, AdministradorViewSet,
    SemestreViewSet, MateriaViewSet, MateriaSemestreViewSet, DocenteMateriaSemestreViewSet,
    SesionClaseViewSet, CredencialQRViewSet, PermisoAsistenciaViewSet, RegistroAsistenciaViewSet, ReporteViewSet, MisMateriasListView,
    MisMateriasConEstudiantesListView, InscripcionViewSet, MisMateriasEstudianteView, csrf_token, get_csrf_token,
    generar_reporte_asistencia, listar_reportes_admin, descargar_reporte_pdf, enviar_notificacion_prueba
)

# Crea una instancia de DefaultRouter
router = DefaultRouter()

# Registra tus ViewSets con el router
router.register(r'usuarios', UsuarioViewSet) # r'' significa una "raw string" para expresiones regulares
router.register(r'carreras', CarreraViewSet)
router.register(r'estudiantes', EstudianteViewSet)
router.register(r'docentes', DocenteViewSet)
router.register(r'administradores', AdministradorViewSet)
router.register(r'semestres', SemestreViewSet)
router.register(r'materias', MateriaViewSet)
router.register(r'materias-semestre', MateriaSemestreViewSet)
router.register(r'docentes-materias-semestre', DocenteMateriaSemestreViewSet, basename='docentes-materias-semestre')
router.register(r'sesiones-clase', SesionClaseViewSet, basename='sesiones-clase')
router.register(r'credenciales-qr', CredencialQRViewSet)
router.register(r'permisos-asistencia', PermisoAsistenciaViewSet)
router.register(r'registros-asistencia', RegistroAsistenciaViewSet, basename='registros-asistencia')
router.register(r'reportes', ReporteViewSet)
router.register(r'inscripciones', InscripcionViewSet, basename='inscripcion')

print("=== RUTAS GENERADAS POR EL ROUTER ===")
for urlpattern in router.urls:
    print(urlpattern)

urlpatterns = [
    # URLs de autenticación (estas no usan el router porque no son ViewSets)
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    
    # Incluye las URLs generadas por el router
    # El router ya genera las rutas para listar/crear y para recuperar/actualizar/borrar por ID
    path('', include(router.urls)), # Incluye las rutas del router
    path('csrf_token/', csrf_token, name='csrf_token'),
    path('get-csrf-token/', get_csrf_token, name='get-csrf-token'),
    path('mis-materias/', MisMateriasListView.as_view(), name='docente-mis-materias'),
    path('mis-materias-con-estudiantes/', MisMateriasConEstudiantesListView.as_view(), name='mis-materias-con-estudiantes'),
    path('mis-materias-estudiante/', MisMateriasEstudianteView.as_view(), name='mis-materias-estudiante'),
    
    # Nuevas URLs para reportes
    path('generar-reporte-asistencia/', generar_reporte_asistencia, name='generar-reporte-asistencia'),
    path('listar-reportes-admin/', listar_reportes_admin, name='listar-reportes-admin'),
    path('descargar-reporte/<int:reporte_id>/', descargar_reporte_pdf, name='descargar_reporte_pdf'),

    path('enviar-notificacion-prueba/', enviar_notificacion_prueba),
]

