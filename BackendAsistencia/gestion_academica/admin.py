from django.contrib import admin
from .models import (
    Usuario, Carrera, Semestre, Materia,
    Estudiante, Docente, Administrador,
    MateriaSemestre, DocenteMateriaSemestre, SesionClase,
    CredencialQR, PermisoAsistencia, RegistroAsistencia, Reporte, DiaEspecial
)
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

class UsuarioAdmin(BaseUserAdmin):
    ordering = ['id']
    list_display = ['email', 'nombre', 'apellido']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Información personal', {'fields': ('nombre', 'apellido')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nombre', 'apellido', 'password1', 'password2'),
        }),
    )

admin.site.register(Usuario, UsuarioAdmin)
admin.site.register(Carrera)
admin.site.register(Semestre)
admin.site.register(Materia)
admin.site.register(Estudiante)
admin.site.register(Docente)
admin.site.register(Administrador)
admin.site.register(MateriaSemestre)
admin.site.register(DocenteMateriaSemestre)
admin.site.register(SesionClase)
admin.site.register(CredencialQR)
admin.site.register(PermisoAsistencia)
admin.site.register(RegistroAsistencia)
admin.site.register(Reporte)

@admin.register(DiaEspecial)
class DiaEspecialAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'tipo', 'descripcion', 'afecta_asistencia', 'creado_por', 'fecha_creacion']
    list_filter = ['tipo', 'afecta_asistencia', 'fecha', 'creado_por']
    search_fields = ['descripcion', 'tipo']
    ordering = ['-fecha']
    date_hierarchy = 'fecha'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('creado_por__usuario')
