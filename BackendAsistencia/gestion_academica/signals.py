from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import DocenteMateriaSemestre, MateriaSemestre

@receiver(post_delete, sender=DocenteMateriaSemestre)
def eliminar_materia_semestre_si_sin_docente(sender, instance, **kwargs):
    materia_semestre = instance.materia_semestre

    # Si ya no hay ninguna asignación a docentes
    if not materia_semestre.docentes_asignados.exists():
        materia_semestre.delete()
