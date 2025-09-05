# TODO: Implement Restriction for Materia-Semestre Assignment

## Completed Tasks
- [x] Backend: Override `create` method in `DocenteMateriaSemestreViewSet` to check if materia_semestre is already assigned to another docente
- [x] Backend: Return 400 error with clear message if materia is already assigned to another docente
- [x] Frontend: Update error handling in `handleAddSubmit` to display backend's "detail" message for failed responses

## Pending Tasks
- [ ] Test the implementation by attempting to assign a materia_semestre already assigned to another docente
- [ ] Verify that the error message is displayed correctly in the frontend
- [ ] Ensure no regressions in existing functionality (adding new assignments, updating, deleting)

## Notes
- The restriction prevents assigning the same materia_semestre to multiple docentes
- Error message format: "La materia '{materia_name}' ya está asignada al docente '{docente_name}'"
- Frontend now extracts and displays the backend's "detail" field for better user experience
