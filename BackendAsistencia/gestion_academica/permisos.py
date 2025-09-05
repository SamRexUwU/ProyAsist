# proyecto/permisos.py
from rest_framework.permissions import BasePermission

class IsEstudiante(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'estudiante_perfil')

class IsDocente(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'docente_perfil')

class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'administrador_perfil')