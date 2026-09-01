import { supabase } from "./supabase-config.js";

async function protegerRuta(rolRequerido) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    window.location.replace("../index.html");
    return false;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("id", session.user.id)
    .single();

  if (perfilError || !perfil || perfil.rol !== rolRequerido) {
    window.location.replace("../index.html");
    return false;
  }

  sessionStorage.setItem("rolUsuario", perfil.rol);
  sessionStorage.setItem("nombreUsuario", perfil.nombre || session.user.email || "");
  return true;
}

async function cerrarSesionSupabase() {
  await supabase.auth.signOut();
  sessionStorage.removeItem("rolUsuario");
  sessionStorage.removeItem("nombreUsuario");
  window.location.replace("../index.html");
}

export { protegerRuta, cerrarSesionSupabase };
