from django.contrib import admin
from .models import (
    Usuario, Carrera, Semestre, Materia,
    Estudiante, Docente, Administrador,
    MateriaSemestre, DocenteMateriaSemestre, SesionClase,
    CredencialQR, PermisoAsistencia, RegistroAsistencia, Reporte
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
