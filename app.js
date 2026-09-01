import { supabase } from "./supabase-config.js";

document.addEventListener('DOMContentLoaded', function () {

    // =====================================================
    // BOTONES PRINCIPALES
    // =====================================================

    const btnIngresar = document.getElementById('btnIngresar');
    const btnAdministrador = document.getElementById('btnAdministrador');
    const btnNuevoIngreso = document.getElementById('btnNuevoIngreso');


    // =====================================================
    // MODALES
    // =====================================================

    const modalIngresar = document.getElementById('modalIngresar');
    const modalAdministrador = document.getElementById('modalAdministrador');


    // =====================================================
    // FUNCIONES MODAL
    // =====================================================

    function abrirModal(modal) {

        if (!modal) return;

        modal.classList.remove('oculto');
        modal.setAttribute('aria-hidden', 'false');
    }


    function cerrarModal(modal) {

        if (!modal) return;

        modal.classList.add('oculto');
        modal.setAttribute('aria-hidden', 'true');
    }


    // =====================================================
    // BOTÓN INGRESAR
    // =====================================================

    if (btnIngresar) {

        btnIngresar.addEventListener('click', function () {

            abrirModal(modalIngresar);

        });

    }


    // =====================================================
    // BOTÓN ADMINISTRADOR
    // =====================================================

    if (btnAdministrador) {

        btnAdministrador.addEventListener('click', function () {

            abrirModal(modalAdministrador);

        });

    }


    // =====================================================
    // BOTÓN NUEVO INGRESO
    // =====================================================

    if (btnNuevoIngreso) {

        btnNuevoIngreso.addEventListener('click', function () {

            window.location.href =
                './Nuevo_ingreso/nuevo_ingreso.html';

        });

    }


    // =====================================================
    // BOTONES X
    // =====================================================

    document.querySelectorAll('[data-cerrar]').forEach(function (boton) {

        boton.addEventListener('click', function () {

            const idModal =
                boton.getAttribute('data-cerrar');

            const modal =
                document.getElementById(idModal);

            cerrarModal(modal);

        });

    });


    // =====================================================
    // CERRAR HACIENDO CLIC FUERA
    // =====================================================

    [
        modalIngresar,
        modalAdministrador
    ].forEach(function (modal) {

        if (!modal) return;

        modal.addEventListener('click', function (evento) {

            if (evento.target === modal) {

                cerrarModal(modal);

            }

        });

    });


    // =====================================================
    // CERRAR CON ESC
    // =====================================================

    document.addEventListener('keydown', function (evento) {

        if (evento.key === 'Escape') {

            cerrarModal(modalIngresar);
            cerrarModal(modalAdministrador);

        }

    });


    // =====================================================
    // LOGIN ÚNICO DEL PERSONAL (mantiene permisos por rol)
    // =====================================================

    const formAdministrador =
        document.getElementById('formAdministrador');

    const usuarioAdmin =
        document.getElementById('usuarioAdmin');

    const passwordAdmin =
        document.getElementById('passwordAdmin');

    const mensajeAdmin =
        document.getElementById('mensajeAdmin');


    if (
        formAdministrador &&
        usuarioAdmin &&
        passwordAdmin &&
        mensajeAdmin
    ) {

        formAdministrador.addEventListener('submit', async function (evento) {

            evento.preventDefault();

            const correo =
                usuarioAdmin.value.trim();

            const clave =
                passwordAdmin.value.trim();


            mensajeAdmin.textContent = '';

            usuarioAdmin.classList.remove('campo-error');
            passwordAdmin.classList.remove('campo-error');


            if (correo === '' || clave === '') {

                mensajeAdmin.textContent =
                    'Complete todos los campos.';

                return;
            }

            const boton = formAdministrador.querySelector('button[type="submit"]');
            if (boton) boton.disabled = true;
            mensajeAdmin.textContent = 'Verificando credenciales...';

            try {
                const { data: authData, error: authError } =
                    await supabase.auth.signInWithPassword({ email: correo, password: clave });

                if (authError) throw authError;

                const { data: perfil, error: perfilError } = await supabase
                    .from('perfiles')
                    .select('nombre, rol')
                    .eq('id', authData.user.id)
                    .single();

                if (perfilError || !perfil) {
                    await supabase.auth.signOut();
                    throw new Error('El usuario no tiene un perfil autorizado.');
                }

                sessionStorage.setItem('rolUsuario', perfil.rol);
                sessionStorage.setItem('nombreUsuario', perfil.nombre || correo);
                mensajeAdmin.textContent = 'Acceso correcto.';

                if (perfil.rol === 'administrador') {
                    window.location.href = 'Administrador/admin.html';
                } else if (perfil.rol === 'docente') {
                    window.location.href = 'Docente/docente.html';
                } else {
                    await supabase.auth.signOut();
                    throw new Error('Rol de usuario no autorizado.');
                }
            } catch (error) {
                mensajeAdmin.textContent = error.message === 'Invalid login credentials'
                    ? 'Correo o contraseña incorrectos.'
                    : `No se pudo iniciar sesión: ${error.message}`;
                usuarioAdmin.classList.add('campo-error');
                passwordAdmin.classList.add('campo-error');
                if (boton) boton.disabled = false;
            }

        });

    }

});
