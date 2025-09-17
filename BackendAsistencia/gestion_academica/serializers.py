from rest_framework import serializers
from datetime import datetime, time
from django.db import transaction # Importa transaction para asegurar la atomicidad
from .models import (
    Usuario, Carrera, Semestre, Materia,
    Estudiante, Docente, Administrador,
    MateriaSemestre, DocenteMateriaSemestre, SesionClase,
    CredencialQR, PermisoAsistencia, RegistroAsistencia, Reporte, Inscripcion, DiaEspecial
)

# Serializador para el modelo Usuario
class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'email', 'nombre', 'apellido', 'password', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True, 'required': True},
        }

    @transaction.atomic
    def create(self, validated_data):
        
        usuario = Usuario.objects.create_user(
            email=validated_data['email'],
            nombre=validated_data['nombre'],
            apellido=validated_data['apellido'],
            password=validated_data['password']
        )
        return usuario

    @transaction.atomic
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


# Serializador para el modelo Carrera
class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = '__all__'


# Serializador para el modelo Semestre
class SemestreSerializer(serializers.ModelSerializer):
    carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)

    class Meta:
        model = Semestre
        # 'carrera' (FK) es necesario para que PrimaryKeyRelatedField funcione en MateriaSemestreSerializer
        fields = ['id', 'nombre', 'carrera', 'carrera_nombre'] 

# Serializador para el modelo Materia
class MateriaSerializer(serializers.ModelSerializer): # Usando tu nombre original
    class Meta:
        model = Materia
        fields = ['id', 'nombre', 'descripcion']


# Serializador para el modelo Estudiante
class EstudianteSerializer(serializers.ModelSerializer):
    # Hacemos que UsuarioSerializer sea de lectura/escritura y se anide
    usuario = UsuarioSerializer()

    # CAMBIO CLAVE: Usamos SerializerMethodField para obtener el nombre de la carrera
    # Esto es más explícito y evita conflictos con el campo 'carrera' de la FK.
    carrera_nombre = serializers.SerializerMethodField()
    
    # CAMBIO CLAVE: Usamos SerializerMethodField para obtener el nombre del semestre
    semestre_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Estudiante
        # CAMBIO CLAVE: Especificamos explícitamente todos los campos a incluir
        fields = [
            'id', 'codigo_institucional', 'usuario', 
            'carrera', 'semestre_actual', # Estos son los IDs que se usan para escribir
            'carrera_nombre', 'semestre_nombre',
              # Estos son los nombres que se usan para leer
        ]

    # Método para obtener el nombre de la carrera
    def get_carrera_nombre(self, obj):
        return obj.carrera.nombre if obj.carrera else None

    # Método para obtener el nombre del semestre
    def get_semestre_nombre(self, obj):
        return obj.semestre_actual.nombre if obj.semestre_actual else None

    # Sobreescribir el método create para manejar el usuario anidado
    @transaction.atomic # Asegura que si falla una parte, se deshace todo
    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario') # Extrae los datos del usuario

        # Validar dominio del email para estudiantes
        email = usuario_data.get('email')
        if not email or not email.endswith('@est.emi.edu.bo'):
            raise serializers.ValidationError({'usuario': {'email': 'El email debe terminar con @est.emi.edu.bo'}})

        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        estudiante = Estudiante.objects.create(usuario=usuario, **validated_data)
        return estudiante

    # Sobreescribir el método update para manejar el usuario anidado
    @transaction.atomic
    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        
        if usuario_data:
            usuario = instance.usuario
            usuario_serializer = UsuarioSerializer(usuario, data=usuario_data, partial=True)
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# Serializador para el modelo Docente
class DocenteSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Docente
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        # Extrae los datos anidados del usuario
        usuario_data = validated_data.pop('usuario')

        # Validar dominio del email para docentes
        email = usuario_data.get('email')
        if not email or not email.endswith('@doc.emi.edu.bo'):
            raise serializers.ValidationError({'usuario': {'email': 'El email debe terminar con @doc.emi.edu.bo'}})

        # Crea el usuario usando el UsuarioSerializer.
        # Esto maneja el hasheo de contraseña y la creación del objeto.
        usuario = Usuario.objects.create_user(**usuario_data)

        # Ahora, crea el objeto Docente y asigna el usuario creado.
        # **validated_data contiene la especialidad y cualquier otro campo del Docente.
        docente = Docente.objects.create(usuario=usuario, **validated_data)

        return docente

    @transaction.atomic
    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        if usuario_data:
            # Obtén el serializador del usuario para actualizarlo
            usuario_serializer = self.fields['usuario']
            usuario_serializer.update(instance.usuario, usuario_data)
        
        # Actualiza el resto de los campos del Docente
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# Serializador para el modelo Administrador
class AdministradorSerializer(serializers.ModelSerializer):
    # ¡CAMBIO CLAVE AQUÍ! Hacemos que UsuarioSerializer sea de lectura/escritura y se anide
    usuario = UsuarioSerializer() 
    # Eliminamos usuario_id
    # usuario_id = serializers.PrimaryKeyRelatedField(
    #     queryset=Usuario.objects.all(), source='usuario', write_only=True
    # )

    class Meta:
        model = Administrador
        fields = '__all__'

    @transaction.atomic
    def create(self, validated_data):
        usuario_data = validated_data.pop('usuario')
        usuario_serializer = UsuarioSerializer(data=usuario_data)
        usuario_serializer.is_valid(raise_exception=True)
        usuario = usuario_serializer.save()

        administrador = Administrador.objects.create(usuario=usuario, **validated_data)
        return administrador

    @transaction.atomic
    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        if usuario_data:
            usuario = instance.usuario
            usuario_serializer = UsuarioSerializer(usuario, data=usuario_data, partial=True)
            usuario_serializer.is_valid(raise_exception=True)
            usuario_serializer.save()
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# Serializador para MateriaSemestre
class MateriaSemestreSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo MateriaSemestre.
    Maneja la lógica de "obtener o crear" la materia por su nombre.
    """
    # Campos para LECTURA (salida del serializador)
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)
    semestre_nombre = serializers.CharField(source='semestre.nombre', read_only=True)
    carrera_semestre = serializers.CharField(source='semestre.carrera.nombre', read_only=True)

    # Nuevo campo para ESCRITURA (entrada del serializador)
    nombre_materia_a_crear_o_seleccionar = serializers.CharField(write_only=True)
    
    # Campo para escritura, espera un ID de Semestre
    semestre = serializers.PrimaryKeyRelatedField(
        queryset=Semestre.objects.all(),
        write_only=True
    )
    
    class Meta:
        model = MateriaSemestre
        fields = [
            'id', 
            'semestre', 
            'gestion', 'dia_semana', 'hora_inicio', 'hora_fin', 
            'materia_nombre', 'semestre_nombre', 'carrera_semestre',
            'nombre_materia_a_crear_o_seleccionar'
        ]

    @transaction.atomic
    def create(self, validated_data):
        # Extraer el nombre de la materia del validated_data
        nombre_materia = validated_data.pop('nombre_materia_a_crear_o_seleccionar')
        
        # Obtener o crear la instancia de Materia
        materia_instance, _ = Materia.objects.get_or_create(
            nombre=nombre_materia
        )

        # Asignar la instancia de Materia al campo 'materia' antes de crear MateriaSemestre
        validated_data['materia'] = materia_instance

        # Ahora podemos crear la instancia de MateriaSemestre
        return MateriaSemestre.objects.create(**validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        # Lógica para actualizar la materia si se envía un nuevo nombre
        nombre_materia = validated_data.pop('nombre_materia_a_crear_o_seleccionar', None)
        if nombre_materia:
            materia_instance, _ = Materia.objects.get_or_create(
                nombre=nombre_materia
            )
            instance.materia = materia_instance
        
        # Llama al método update original de ModelSerializer
        return super().update(instance, validated_data)

# Serializador para DocenteMateriaSemestre
class DocenteMateriaSemestreSerializer(serializers.ModelSerializer):
    """
    Serializador principal que maneja la asignación de docentes a materias-semestres.
    """
    docente_info = DocenteSerializer(source='docente', read_only=True)
    materia_semestre_info = MateriaSemestreSerializer(source='materia_semestre', read_only=True)

    docente = serializers.PrimaryKeyRelatedField(queryset=Docente.objects.all(), write_only=True)
    materia_semestre = MateriaSemestreSerializer(write_only=True)

    class Meta:
        model = DocenteMateriaSemestre
        fields = [
            'id', 'docente', 'materia_semestre',
            'docente_info', 'materia_semestre_info'
        ]

    @transaction.atomic
    def create(self, validated_data):
        # 1. Extrae los datos anidados
        materia_semestre_data = validated_data.pop('materia_semestre')
        docente_instance = validated_data.pop('docente')

        # 2. Delega la creación de la instancia de MateriaSemestre a su propio serializador
        # Esto ejecutará el método `create` de MateriaSemestreSerializer.
        materia_semestre_serializer = self.fields['materia_semestre']
        materia_semestre_instance = materia_semestre_serializer.create(materia_semestre_data)
        
        # 3. Usa la instancia creada para crear el registro final
        docente_materia_semestre = DocenteMateriaSemestre.objects.create(
            docente=docente_instance,
            materia_semestre=materia_semestre_instance,
            **validated_data
        )
        return docente_materia_semestre

    @transaction.atomic
    def update(self, instance, validated_data):
        # El método update para anidados es más complejo.
        docente_data = validated_data.pop('docente', None)
        materia_semestre_data = validated_data.pop('materia_semestre', None)

        # Actualiza el docente si se proporciona un nuevo valor
        if docente_data:
            instance.docente = docente_data

        # Actualiza el serializador anidado si se envía data para él
        if materia_semestre_data:
            materia_semestre_serializer = self.fields['materia_semestre']
            materia_semestre_instance = instance.materia_semestre
            materia_semestre_serializer.update(materia_semestre_instance, materia_semestre_data)

        # Actualiza el resto de los campos de la instancia principal
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance

# Serializador para SesionClase
class SesionClaseSerializer(serializers.ModelSerializer):
    # Campo anidado solo para lectura
    materia_semestre_info = MateriaSemestreSerializer(source='materia_semestre', read_only=True)

    class Meta:
        model = SesionClase
        fields = ['id', 'materia_semestre', 'materia_semestre_info', 'fecha', 'hora_inicio', 'hora_fin', 'tema']


# Serializador para CredencialQR
class CredencialQRSerializer(serializers.ModelSerializer):
    estudiante_info = EstudianteSerializer(source='estudiante', read_only=True)

    class Meta:
        model = CredencialQR
        fields = '__all__'
        read_only_fields = ('uuid',)


# Serializador para PermisoAsistencia
class PermisoAsistenciaSerializer(serializers.ModelSerializer):
    estudiante_info = EstudianteSerializer(source='estudiante', read_only=True)
    administrador_aprobador_info = AdministradorSerializer(source='administrador_aprobador', read_only=True)
    
    sesiones_cubiertas = serializers.PrimaryKeyRelatedField(
        queryset=SesionClase.objects.all(), many=True, write_only=True
    )
    sesiones_cubiertas_info = SesionClaseSerializer(source='sesiones_cubiertas', many=True, read_only=True)

    class Meta:
        model = PermisoAsistencia
        fields = '__all__'
        read_only_fields = ('fecha_solicitud',)

        
    def validate_sesiones_cubiertas(self, value):
        estudiante = self.initial_data.get('estudiante')
        if estudiante:
            estudiante_obj = Estudiante.objects.get(pk=estudiante)
            # Verificar que todas las sesiones sean del mismo semestre que el estudiante
            semestres = {s.materia_semestre.semestre for s in value}
            if len(semestres) > 1 or (semestres and estudiante_obj.semestre_actual not in semestres):
                raise serializers.ValidationError(
                    "Las sesiones deben pertenecer al semestre actual del estudiante."
                )
        return value


# Serializador para RegistroAsistencia
class RegistroAsistenciaSerializer(serializers.ModelSerializer):
    estudiante_info = EstudianteSerializer(source='estudiante', read_only=True)
    sesion_info = SesionClaseSerializer(source='sesion', read_only=True)
    permiso_asistencia_info = PermisoAsistenciaSerializer(source='permiso_asistencia', read_only=True)

    permiso_asistencia_id = serializers.PrimaryKeyRelatedField(
        queryset=PermisoAsistencia.objects.all(), source='permiso_asistencia', write_only=True, allow_null=True
    )

    class Meta:
        model = RegistroAsistencia
        fields = '__all__'
        read_only_fields = ('fecha_registro', 'estado',)

    def create(self, validated_data):
        instance = super().create(validated_data)
        instance.set_estado_asistencia()
        instance.save(update_fields=['estado'])
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.set_estado_asistencia()
        instance.save(update_fields=['estado'])
        return instance


# Serializador para Reporte
class ReporteSerializer(serializers.ModelSerializer):
    generado_por_docente_info = DocenteSerializer(source='generado_por_docente', read_only=True)
    generado_por_administrador_info = AdministradorSerializer(source='generado_por_administrador', read_only=True)

    generado_por_docente_id = serializers.PrimaryKeyRelatedField(
        queryset=Docente.objects.all(), source='generado_por_docente', write_only=True, allow_null=True
    )
    generado_por_administrador_id = serializers.PrimaryKeyRelatedField(
        queryset=Administrador.objects.all(), source='generado_por_administrador', write_only=True, allow_null=True
    )

    class Meta:
        model = Reporte
        fields = '__all__'
        read_only_fields = ('fecha_generacion',)


class MisMateriasSerializer(serializers.ModelSerializer):
    """
    Serializador para mostrar la lista de materias de un docente.
    Se basa en el modelo intermedio DocenteMateriaSemestre.
    """
    materia_nombre = serializers.CharField(source='materia_semestre.materia.nombre', read_only=True)
    carrera_nombre = serializers.CharField(source='materia_semestre.semestre.carrera.nombre', read_only=True)
    semestre_nombre = serializers.CharField(source='materia_semestre.semestre.nombre', read_only=True)
    gestion = serializers.CharField(source='materia_semestre.gestion', read_only=True)
    dia_semana = serializers.CharField(source='materia_semestre.dia_semana', read_only=True)
    hora_inicio = serializers.CharField(source='materia_semestre.hora_inicio', read_only=True)
    hora_fin = serializers.CharField(source='materia_semestre.hora_fin', read_only=True)

    class Meta:
        model = DocenteMateriaSemestre
        fields = [
            'id', 
            'materia_nombre', 
            'carrera_nombre', 
            'semestre_nombre',
            'gestion', 
            'dia_semana', 
            'hora_inicio', 
            'hora_fin',
        ]



class EstudianteSimpleSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Estudiante
        fields = ['id', 'codigo_institucional', 'nombre_completo']

    def get_nombre_completo(self, obj):
        return obj.usuario.get_full_name()

# Serializador para mostrar materias de un docente con sus estudiantes
class EstudianteSimpleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo_institucional = serializers.CharField()
    nombre = serializers.CharField(source='usuario.nombre')
    apellido = serializers.CharField(source='usuario.apellido')

class MisMateriasConEstudiantesSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.CharField(source='materia_semestre.materia.nombre')
    carrera_nombre = serializers.CharField(source='materia_semestre.semestre.carrera.nombre')
    semestre_nombre = serializers.CharField(source='materia_semestre.semestre.nombre')
    gestion = serializers.CharField(source='materia_semestre.gestion')
    dia_semana = serializers.CharField(source='materia_semestre.dia_semana')
    hora_inicio = serializers.TimeField(source='materia_semestre.hora_inicio')
    hora_fin = serializers.TimeField(source='materia_semestre.hora_fin')
    estudiantes = serializers.SerializerMethodField()

    class Meta:
        model = DocenteMateriaSemestre
        fields = [
            'id', 'materia_nombre', 'carrera_nombre', 'semestre_nombre',
            'gestion', 'dia_semana', 'hora_inicio', 'hora_fin', 'estudiantes'
        ]

    def get_estudiantes(self, obj):
        # Estudiantes que coinciden con la carrera y semestre de la materia
        return Estudiante.objects.filter(
            carrera=obj.materia_semestre.semestre.carrera,
            semestre_actual=obj.materia_semestre.semestre
        ).select_related('usuario').values(
            'id', 'codigo_institucional', 'usuario__nombre', 'usuario__apellido'
        )
        
    
class InscripcionSerializer(serializers.ModelSerializer):
    estudiante = EstudianteSerializer(read_only=True)
    materia_semestre = MateriaSemestreSerializer(read_only=True)

    class Meta:
        model = Inscripcion
        fields = '__all__'

class InscripcionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inscripcion
        fields = ['id', 'estudiante', 'materia_semestre']


class DocenteMiniSerializer(serializers.Serializer):
    nombre = serializers.CharField(source='usuario.nombre')
    apellido = serializers.CharField(source='usuario.apellido')

class MateriaConDocentesSerializer(serializers.ModelSerializer):
    docentes = serializers.SerializerMethodField()
    class Meta:
        model = MateriaSemestre
        fields = [
            'id', 'materia__nombre', 'semestre__nombre', 'gestion',
            'dia_semana', 'hora_inicio', 'hora_fin', 'docentes'
        ]

    def get_docentes(self, obj):
        return [
            {'nombre': d.docente.usuario.nombre, 'apellido': d.docente.usuario.apellido}
            for d in obj.docentemateriasemestre_set.all()
        ]
    
from rest_framework import serializers

class MateriaEstudianteSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.CharField(source='materia.nombre')
    semestre_nombre = serializers.CharField(source='semestre.nombre')
    carrera_nombre = serializers.CharField(source='semestre.carrera.nombre')
    materia_id = serializers.IntegerField(source='materia.id')  # Añadir ID de Materia
    docentes = serializers.SerializerMethodField()
    sesion_activa = serializers.SerializerMethodField()

    class Meta:
        model = MateriaSemestre
        fields = [
            'id', 'materia_id', 'materia_nombre', 'semestre_nombre', 'carrera_nombre',
            'gestion', 'dia_semana', 'hora_inicio', 'hora_fin', 'docentes', 'sesion_activa'
        ]

    def get_docentes(self, obj):
        return [
            {'nombre': d.docente.usuario.nombre, 'apellido': d.docente.usuario.apellido}
            for d in obj.docentes_asignados.all()
        ]

    def get_sesion_activa(self, obj):
        hoy = datetime.now().date()
        ahora = datetime.now().time()
        sesiones = SesionClase.objects.filter(
            materia_semestre=obj,
            fecha=hoy,
            hora_inicio__lte=ahora,
            hora_fin__gte=ahora
        )
        return sesiones.exists()
    
class MateriaSemestreDetalleSerializer(serializers.ModelSerializer):
    materia = MateriaSerializer()
    semestre = SemestreSerializer()
    
    class Meta:
        model = MateriaSemestre
        fields = ['id', 'materia', 'semestre', 'gestion', 'dia_semana', 'hora_inicio', 'hora_fin']



class MateriaSemestreMiniSerializer(serializers.ModelSerializer):
    materia = MateriaSerializer(read_only=True)

    class Meta:
        model = MateriaSemestre
        fields = ['id', 'materia', 'gestion', 'dia_semana', 'hora_inicio', 'hora_fin']

# Serializador para DiaEspecial
class DiaEspecialSerializer(serializers.ModelSerializer):
    creado_por_info = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DiaEspecial
        fields = ['id', 'fecha', 'tipo', 'descripcion', 'afecta_asistencia', 'creado_por', 'creado_por_info', 'fecha_creacion']
        read_only_fields = ['fecha_creacion']

    def get_creado_por_info(self, obj):
        if obj.creado_por:
            return {
                'id': obj.creado_por.id,
                'nombre_completo': obj.creado_por.usuario.get_full_name()
            }
        return None

    def create(self, validated_data):
        # Asignar automáticamente el administrador que crea el día especial
        user = self.context['request'].user
        if hasattr(user, 'administrador_perfil'):
            validated_data['creado_por'] = user.administrador_perfil
        return super().create(validated_data)
