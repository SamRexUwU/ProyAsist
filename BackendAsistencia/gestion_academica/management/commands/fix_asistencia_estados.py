from django.core.management.base import BaseCommand
from gestion_academica.models import RegistroAsistencia


class Command(BaseCommand):
    help = 'Corrige los estados de asistencia existentes que están marcados incorrectamente como FALTA'

    def handle(self, *args, **options):
        self.stdout.write('Iniciando corrección de estados de asistencia...')
        
        # Obtener todos los registros de asistencia que tienen estado FALTA
        registros_falta = RegistroAsistencia.objects.filter(estado='FALTA')
        
        self.stdout.write(f'Encontrados {registros_falta.count()} registros con estado FALTA')
        
        corregidos = 0
        for registro in registros_falta:
            try:
                # Recalcular el estado
                estado_anterior = registro.estado
                registro.set_estado_asistencia()
                
                if registro.estado != estado_anterior:
                    registro.save(update_fields=['estado'])
                    corregidos += 1
                    self.stdout.write(
                        f'Registro {registro.id}: {estado_anterior} -> {registro.estado}'
                    )
                else:
                    self.stdout.write(
                        f'Registro {registro.id}: estado correcto ({registro.estado})'
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error al corregir registro {registro.id}: {e}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Proceso completado. {corregidos} registros corregidos.')
        )
