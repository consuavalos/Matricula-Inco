document.addEventListener('DOMContentLoaded', function () {

    // =====================================================
    // BOTONES PRINCIPALES
    // =====================================================

    const btnIngresar = document.getElementById('btnIngresar');
    const btnAdministrador = document.getElementById('btnAdministrador');
    const btnNuevoIngreso = document.getElementById('btnNuevoIngreso');
    const btnDocente = document.getElementById('btnDocente');


    // =====================================================
    // MODALES
    // =====================================================

    const modalIngresar = document.getElementById('modalIngresar');
    const modalAdministrador = document.getElementById('modalAdministrador');
    const modalDocente = document.getElementById('modalDocente');


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
    // BOTÓN DOCENTE
    // =====================================================

    if (btnDocente) {

        btnDocente.addEventListener('click', function () {

            cerrarModal(modalIngresar);

            abrirModal(modalDocente);

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
        modalAdministrador,
        modalDocente
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
            cerrarModal(modalDocente);

        }

    });


    // =====================================================
    // LOGIN ADMINISTRADOR
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

        formAdministrador.addEventListener('submit', function (evento) {

            evento.preventDefault();

            const usuario =
                usuarioAdmin.value.trim();

            const clave =
                passwordAdmin.value.trim();


            mensajeAdmin.textContent = '';

            usuarioAdmin.classList.remove('campo-error');
            passwordAdmin.classList.remove('campo-error');


            if (usuario === '' || clave === '') {

                mensajeAdmin.textContent =
                    'Complete todos los campos.';

                return;
            }


            if (
                usuario === 'admin' &&
                clave === 'Admin-INCO'
            ) {

                mensajeAdmin.textContent =
                    'Usuario y contraseña correctos.';

                console.log('Entrando al administrador...');

                // Guardamos la sesión: admin.html revisa esto antes de dejar entrar
                sessionStorage.setItem('rolUsuario', 'administrador');
                sessionStorage.setItem('nombreUsuario', usuario);

                window.location.href = 'Administrador/admin.html';

                return;
            }


            mensajeAdmin.textContent =
                'Usuario o contraseña incorrectos.';

            usuarioAdmin.classList.add('campo-error');
            passwordAdmin.classList.add('campo-error');

        });

    }


    // =====================================================
    // LOGIN DOCENTE
    // =====================================================

    const formDocente =
        document.getElementById('formDocente');

    const usuarioDocente =
        document.getElementById('usuarioDocente');

    const passwordDocente =
        document.getElementById('passwordDocente');

    const mensajeDocente =
        document.getElementById('mensajeDocente');


    if (
        formDocente &&
        usuarioDocente &&
        passwordDocente &&
        mensajeDocente
    ) {

        formDocente.addEventListener('submit', function (evento) {

            evento.preventDefault();

            const usuario =
                usuarioDocente.value.trim();

            const clave =
                passwordDocente.value.trim();


            mensajeDocente.textContent = '';

            usuarioDocente.classList.remove('campo-error');
            passwordDocente.classList.remove('campo-error');


            if (usuario === '' || clave === '') {

                mensajeDocente.textContent =
                    'Complete todos los campos.';

                return;
            }


            if (
                usuario === 'docente' &&
                clave === 'INCOdocente'
            ) {

                mensajeDocente.textContent =
                    'Usuario y contraseña correctos.';

                console.log('Entrando al docente...');

                // Guardamos la sesión: docente.html revisa esto antes de dejar entrar
                sessionStorage.setItem('rolUsuario', 'docente');
                sessionStorage.setItem('nombreUsuario', usuario);

                window.location.href ='Docente/docente.html';

                return;
            }


            mensajeDocente.textContent =
                'Usuario o contraseña incorrectos.';

            usuarioDocente.classList.add('campo-error');
            passwordDocente.classList.add('campo-error');

        });

    }

});