import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

const STORAGE_KEY = "hn-lang";

type Dict = Record<string, string>;

/**
 * Translation table. Keys are the English source strings so untranslated
 * copy still renders sensibly.
 */
const es: Dict = {
  // Nav
  Home: "Inicio",
  "My Listings": "Mis anuncios",
  Chat: "Chat",
  Profile: "Perfil",
  Share: "Compartir",

  // Auth
  "Share anything anytime with your closest neighbors":
    "Comparte cualquier cosa en cualquier momento con tus vecinos más cercanos",
  "Share and find anything in your neighborhood":
    "Comparte y encuentra de todo en tu vecindario",
  "Share food, clothing, furniture and more...":
    "Comparte comida, ropa, muebles y más...",
  "All items deserve a second home.":
    "Todos los artículos merecen una segunda vida.",
  "Log In": "Iniciar sesión",
  "Sign Up": "Registrarse",
  Username: "Nombre de usuario",
  Email: "Correo electrónico",
  Password: "Contraseña",
  "Confirm Password": "Confirmar contraseña",
  "Create Account": "Crear cuenta",
  or: "o",
  "Continue with Google": "Continuar con Google",
  "By creating an account, you agree to our": "Al crear una cuenta, aceptas nuestros",
  and: "y",
  "Terms of Service": "Términos del servicio",
  "Privacy Policy": "Política de privacidad",
  "Enter a valid email": "Introduce un correo válido",
  "Enter your password": "Introduce tu contraseña",
  "Username is too short": "El nombre de usuario es muy corto",
  "Use at least 8 characters": "Usa al menos 8 caracteres",
  "Passwords do not match": "Las contraseñas no coinciden",
  "Check your details": "Revisa tus datos",
  "Google sign-in failed. Please try again.":
    "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",

  // Verify
  "Verify your email": "Verifica tu correo",
  "Check your inbox": "Revisa tu bandeja de entrada",
  "We sent a verification link to": "Enviamos un enlace de verificación a",
  "Resend email": "Reenviar correo",
  "Back to login": "Volver a iniciar sesión",
  "Verification email sent.": "Correo de verificación enviado.",
  "I've verified — continue": "Ya lo verifiqué — continuar",

  // Home
  "Items from your neighbors": "Artículos de tus vecinos",
  "Nearby Neighbors": "Vecinos cercanos",
  "Nothing nearby yet": "Todavía no hay nada cerca",
  "Be the first to share something with your neighbors.":
    "Sé el primero en compartir algo con tus vecinos.",
  "Share an item": "Compartir un artículo",
  Unopened: "Sin abrir",
  "Best before": "Consumir antes de",
  away: "de distancia",
  "Loading nearby items…": "Cargando artículos cercanos…",
  "Edit": "Editar",
  "Edit item": "Editar artículo",
  "Update the details anytime": "Actualiza los detalles en cualquier momento",
  "Your changes are saved.": "Tus cambios se han guardado.",
  "Could not save those changes. Please try again.": "No se pudieron guardar los cambios. Inténtalo de nuevo.",
  "You can only edit your own items.": "Solo puedes editar tus propios artículos.",
  "Loading…": "Cargando…",
  "Turn on location": "Activar ubicación",
  "Within 1 km of you": "A menos de 1 km de ti",
  "Within {radius} km of you": "A menos de {radius} km de ti",
  "your current location": "tu ubicación actual",
  "your saved address": "tu dirección guardada",
  everywhere: "todos lados",
  "Matching from {source}": "Coincidencias de {source}",
  "Finding items nearby…": "Buscando artículos cercanos…",
  "Nothing nearby just yet": "Todavía no hay nada cerca",
  "Widen your radius in your profile, or be the first to share something.":
    "Amplía tu radio en tu perfil, o sé el primero en compartir algo.",
  Notifications: "Notificaciones",
  "Open this listing to message the neighbor": "Abrir este anuncio para escribir al vecino",

  // Item detail
  "Item details": "Detalles del artículo",
  Description: "Descripción",
  Condition: "Estado",
  New: "Nuevo",
  Used: "Usado",
  Category: "Categoría",
  "Unopened Food": "Alimentos sin abrir",
  Clothing: "Ropa",
  Furniture: "Muebles",
  Item: "Artículo",
  "Chat with neighbor": "Chatear con el vecino",
  "Accept item": "Aceptar artículo",
  "I accept this item and agree to collect it": "Acepto este artículo y me comprometo a recogerlo",
  "Waiting for the owner to agree": "Esperando la confirmación del dueño",
  "Pay €1.00": "Pagar 1,00 €",
  "View item": "Ver artículo",
  "Your {limit} free items this month are used. Pay €1.00 for this item to chat with your neighbor — browsing stays free.":
    "Ya usaste tus {limit} artículos gratis de este mes. Paga 1,00 € por este artículo para chatear con tu vecino: mirar siempre es gratis.",
  "No homemade or opened food may be shared.":
    "No se puede compartir comida casera ni alimentos abiertos.",
  Report: "Reportar",
  "Shared by": "Compartido por",
  "Loading item…": "Cargando artículo…",
  Nearby: "Cerca de ti",
  "{name} has to agree too — we've let them know.":
    "{name} también tiene que aceptar — ya se lo hicimos saber.",
  "Could not accept this item. Please try again.":
    "No se pudo aceptar este artículo. Inténtalo de nuevo.",
  "Could not open the chat.": "No se pudo abrir el chat.",
  "Thanks — our team will review this listing.":
    "Gracias — nuestro equipo revisará este anuncio.",
  "Could not send that report.": "No se pudo enviar el reporte.",
  "This item is no longer available.": "Este artículo ya no está disponible.",
  "Back to nearby items": "Volver a los artículos cercanos",
  "Report listing": "Reportar anuncio",
  "No description added.": "No se añadió descripción.",
  "This is your own listing.": "Este es tu propio anuncio.",
  "Chat with {name}": "Chatear con {name}",
  "You accepted this item. Waiting for {name} to agree — it only counts once you both agree.":
    "Aceptaste este artículo. Esperando que {name} confirme — solo cuenta cuando ambos estén de acuerdo.",
  "You both agreed. Your {limit} free items this month are used, so this one costs €1.00.":
    "Ambos aceptaron. Ya usaste tus {limit} artículos gratis este mes, así que este cuesta 1,00 €.",
  "You both agreed — this item is yours to collect.":
    "Ambos aceptaron — este artículo es tuyo para recoger.",
  "I accept this item and agree to collect it from {name}.":
    "Acepto este artículo y me comprometo a recogerlo de {name}.",
  "My {limit} free items this month are used, so this one costs €1.00 once we both agree.":
    "Ya usé mis {limit} artículos gratis de este mes, así que este cuesta 1,00 € una vez que ambos aceptemos.",
  "It counts toward my {limit} free items this month only once {name} agrees too.":
    "Cuenta para mis {limit} artículos gratis de este mes solo cuando {name} también acepte.",

  // Listings
  "Requests to agree": "Solicitudes por confirmar",
  "I agree — hand it over": "Acepto — se lo entrego",
  "You have no listings yet.": "Todavía no tienes anuncios.",
  Active: "Activo",
  Claimed: "Reclamado",
  Delete: "Eliminar",
  "Claims only count once both neighbors agree.":
    "Las reclamaciones solo cuentan cuando ambos vecinos están de acuerdo.",

  // Share
  "Neighbor Sharing": "Compartir entre vecinos",
  "Give it a second home nearby": "Dale un segundo hogar cerca de ti",
  Title: "Título",
  Photo: "Foto",
  "Add photo": "Añadir foto",
  "Best before date": "Fecha de consumo preferente",
  "Post item": "Publicar artículo",
  "Item shared with your neighbors.": "Artículo compartido con tus vecinos.",
  "I confirm this food is unopened and shop-packaged.":
    "Confirmo que este alimento está sin abrir y envasado en tienda.",

  // Chat
  Messages: "Mensajes",
  "No conversations yet": "Todavía no hay conversaciones",
  "Type a message…": "Escribe un mensaje…",
  Send: "Enviar",

  // Pay
  Payment: "Pago",
  "You've used your 2 free claims this month.":
    "Ya usaste tus 2 reclamaciones gratis de este mes.",
  "Free claims used": "Reclamaciones gratis usadas",
  "2 free claims per month": "2 reclamaciones gratis por mes",

  // Profile
  "My Profile": "Mi perfil",
  "First Name": "Nombre",
  "Last Name": "Apellido",
  "Phone Number": "Teléfono",
  "First name": "Nombre",
  "Last name": "Apellido",
  "Phone number": "Teléfono",
  Address: "Dirección",
  City: "Ciudad",
  Postcode: "Código postal",
  "Match radius (km)": "Radio de coincidencia (km)",
  "Save changes": "Guardar cambios",
  "Your profile": "Tu perfil",
  "Loading profile…": "Cargando perfil…",
  "Profile updated.": "Perfil actualizado.",
  "Could not save your profile.": "No se pudo guardar tu perfil.",
  "Photo updated.": "Foto actualizada.",
  "Could not upload that photo.": "No se pudo subir esa foto.",
  "Location is not available on this device.": "La ubicación no está disponible en este dispositivo.",
  "Home location saved for 1 km matching.":
    "Ubicación guardada para coincidencias de 1 km.",
  "Could not save your location.": "No se pudo guardar tu ubicación.",
  "Location permission denied.": "Permiso de ubicación denegado.",
  "Log out": "Cerrar sesión",
  "Sign out": "Cerrar sesión",

  // Safety & blocking
  "Please remove offensive or sexual language before continuing.":
    "Por favor elimina el lenguaje ofensivo o sexual antes de continuar.",
  "That photo looks unsafe. Nudity, sexual or explicit images are not allowed.":
    "Esa foto no es apropiada. No se permiten imágenes de desnudos, sexuales ni explícitas.",
  "You can't message this neighbor because one of you blocked the other.":
    "No puedes escribir a este vecino porque uno de los dos bloqueó al otro.",
  "Block neighbor": "Bloquear vecino",
  "Block this neighbor?": "¿Bloquear a este vecino?",
  "They won't be able to message you and you won't see each other's items. You can unblock them later from your profile.":
    "No podrá escribirte y no verán los artículos del otro. Puedes desbloquearlo más tarde desde tu perfil.",
  Block: "Bloquear",
  Unblock: "Desbloquear",
  "Blocked neighbors": "Vecinos bloqueados",
  "You haven't blocked anyone.": "No has bloqueado a nadie.",
  "Neighbor blocked. You won't see each other in the app.":
    "Vecino bloqueado. No se verán en la app.",
  "Neighbor unblocked.": "Vecino desbloqueado.",
  "Could not block this neighbor.": "No se pudo bloquear a este vecino.",
  "Could not unblock this neighbor.": "No se pudo desbloquear a este vecino.",
  "You blocked this neighbor. Unblock them from your profile to chat again.":
    "Bloqueaste a este vecino. Desbloquéalo desde tu perfil para volver a chatear.",
  "This conversation is closed because this neighbor blocked you.":
    "Esta conversación está cerrada porque este vecino te bloqueó.",

  Language: "Idioma",
  English: "Inglés",
  Spanish: "Español",
  "Admin dashboard": "Panel de administración",
  "Edit profile": "Editar perfil",
  "Not set": "No establecido",
  "of": "de",
  "free claims used this month. Free claims reset on the 1st; extra claims cost €1.00 each.":
    "reclamaciones gratis usadas este mes. Las reclamaciones gratis se reinician el día 1; cada reclamación extra cuesta 1,00 €.",
  "Matching radius": "Radio de coincidencia",
  "Home location saved": "Ubicación guardada",
  "No home location yet": "Todavía no hay ubicación guardada",
  "Use my current location": "Usar mi ubicación actual",
  "GitHub Sync": "Sincronizar GitHub",
  "Sync to GitHub": "Sincronizar con GitHub",
  "The app can't force a Lovable push directly — it has to be triggered from the Lovable editor. Follow these steps to push the latest code to GitHub before building in Codemagic.":
    "La app no puede forzar la sincronización de Lovable directamente: hay que hacerlo desde el editor de Lovable. Sigue estos pasos para enviar el código más reciente a GitHub antes de compilar en Codemagic.",
  "Open the Lovable editor for this project.": "Abre el editor de Lovable de este proyecto.",
  "Click the Plus (+) menu in the chat input (bottom-left).": "Haz clic en el menú Plus (+) del campo de chat (abajo a la izquierda).",
  "Choose GitHub → Manage project.": "Elige GitHub → Gestionar proyecto.",
  "Lovable will push the latest code to the connected repo automatically.": "Lovable enviará automáticamente el código más reciente al repositorio conectado.",
  "Then go to Codemagic and trigger the 'ios-appstore' build workflow.": "Luego ve a Codemagic y activa el flujo de trabajo 'ios-appstore'.",
  "Open Lovable": "Abrir Lovable",
  "Open GitHub repo": "Abrir repositorio de GitHub",
  "Open Codemagic": "Abrir Codemagic",
  "Copy steps": "Copiar pasos",
  "Copied": "Copiado",
  "Sync steps copied to clipboard.": "Pasos de sincronización copiados al portapapeles.",
  "Could not copy steps.": "No se pudieron copiar los pasos.",
  "Be kind, be safe": "Sé amable, sé seguro",
  "Loading chats…": "Cargando chats…",
  "No chats yet. Tap “I'm interested” on an item to start one.":
    "Todavía no hay chats. Toca “Me interesa” en un artículo para empezar uno.",
  "Say hello": "Saluda",
  "Send a photo": "Enviar una foto",
  "Send message": "Enviar mensaje",
  "Type a message...": "Escribe un mensaje...",
  "Message not sent. Please try again.": "No se pudo enviar el mensaje. Inténtalo de nuevo.",
  "Could not send that photo.": "No se pudo enviar esa foto.",
  "Be kind, be safe.": "Sé amable, sé seguro.",
  "Never share personal or payment information.": "Nunca compartas información personal ni de pago.",
  "Loading messages…": "Cargando mensajes…",
  "Chat with a neighbor": "Chatear con un vecino",
  "Chat with": "Chatear con",

  "Hide password": "Ocultar contraseña",
  "Show password": "Mostrar contraseña",
  "Verify Your Email": "Verifica tu correo",
  "We've sent a verification link to": "Te hemos enviado un enlace de verificación a",
  "your inbox": "tu bandeja de entrada",
  "Please check your inbox and click the link to verify your email address. You can log in as soon as it's confirmed.":
    "Revisa tu bandeja de entrada y haz clic en el enlace para verificar tu correo electrónico. Podrás iniciar sesión en cuanto se confirme.",
  "Back to Log In": "Volver a iniciar sesión",
  "Resend Email": "Reenviar correo",
  "Change Email Address": "Cambiar dirección de correo",
  "Go back and enter your email again.": "Vuelve atrás e introduce tu correo de nuevo.",
  "Verification email sent again.": "Correo de verificación reenviado.",
  // Misc
  Back: "Atrás",
  "Go back": "Volver",
  Cancel: "Cancelar",
  "Delete this item?": "¿Eliminar este artículo?",
  "It disappears from your neighbors' feed right away. This can't be undone.":
    "Desaparecerá del muro de tus vecinos de inmediato. Esta acción no se puede deshacer.",
  "Item deleted.": "Artículo eliminado.",
  "Could not delete that item.": "No se pudo eliminar ese artículo.",

  Save: "Guardar",
  Loading: "Cargando",

  // Share / Listings / Pay
  "Give your item a name": "Dale un nombre a tu artículo",
  "A best before date is required for food items": "Se requiere una fecha de caducidad para los alimentos",
  "Please confirm the food is unopened and shop-packaged": "Confirma que el alimento está sin abrir y envasado de fábrica",
  "Keep the description under 300 characters": "Mantén la descripción en menos de 300 caracteres",
  "Only unopened packaged food may be listed.": "Solo se pueden publicar alimentos envasados sin abrir.",
  "Make sure items are clean, usable and safe to pass on.": "Asegúrate de que los artículos estén limpios, utilizables y sean seguros para compartir.",
  "Item preview": "Vista previa del artículo",
  "Remove photo": "Quitar foto",
  "Add a photo": "Añadir una foto",
  "What is it?": "¿Qué es?",
  "e.g. Unopened pasta, small jacket, desk chair": "p. ej. Pasta sin abrir, chaqueta pequeña, silla de escritorio",
  "Size, brand, condition, or why you're passing it on.": "Tamaño, marca, estado, o por qué lo estás compartiendo.",
  "Best Before": "Fecha de caducidad",
  "(required for food)": "(requerido para alimentos)",
  "Pickup area": "Zona de recogida",
  "(shown to neighbors)": "(se muestra a los vecinos)",
  "Oak Street, Dublin 2": "Calle Roble, Dublín 2",
  "I confirm this is unopened, shop-packaged food — nothing homemade, cooked or opened.":
    "Confirmo que es un alimento sin abrir y envasado de fábrica — nada casero, cocinado o abierto.",
  "Use my current location for 1 km matching. Your exact coordinates are never shown to neighbors — only the distance.":
    "Usar mi ubicación actual para coincidencias de 1 km. Tus coordenadas exactas nunca se muestran a los vecinos — solo la distancia.",
  "Publish item": "Publicar artículo",
  "Your item is live for neighbors nearby.": "Tu artículo ya está disponible para los vecinos cercanos.",
  "Could not publish that item. Please try again.": "No se pudo publicar ese artículo. Inténtalo de nuevo.",

  "free claims used this month": "reclamaciones gratis usadas este mes",
  "Sharing is always free.": "Compartir siempre es gratis.",
  "Sharing is always free. As a receiver you get": "Compartir siempre es gratis. Como receptor tienes",
  "free claims per month": "reclamaciones gratis al mes",
  "left": "restantes",
  "you've used them all": "ya las has usado todas",
  "After that it's €1.00 per extra claim. A claim only counts once both neighbors agree.":
    "Después de eso cuesta €1.00 por reclamación extra. Una reclamación solo cuenta cuando ambos vecinos están de acuerdo.",
  "Hey Neighbor is a community sharing app that connects you with neighbors within a 1 km radius. Give away items you no longer need or discover free items from people nearby, including unopened packaged food and household essentials. Chat securely to arrange convenient pickups, reduce waste, and strengthen your local community. Receiving items is free for your first 2 transactions each month. After that, each additional transaction is just €1. Share more, waste less, and make a positive impact—right in your own neighborhood.":
    "Hey Neighbor es una app de comunidad para compartir que te conecta con vecinos a menos de 1 km de distancia. Regala lo que ya no necesitas o descubre artículos gratis de personas cercanas, incluyendo alimentos envasados sin abrir y artículos esenciales del hogar. Chatea de forma segura para coordinar recogidas convenientes, reducir desperdicios y fortalecer tu comunidad local. Recibir artículos es gratis en tus primeras 2 transacciones cada mes. Después de eso, cada transacción adicional cuesta 1 €. Comparte más, desperdicia menos y genera un impacto positivo — justo en tu propio vecindario.",
  "1 km": "1 km",
  "radius": "radio",
  "2 free": "2 gratis",
  "per month": "al mes",
  "& pickup": "y recogida",
  "accepted your item": "aceptó tu artículo",
  "Your item": "Tu artículo",
  "You agreed. Waiting for": "Aceptaste. Esperando a",
  "to pay the €1.00 fee.": "para que pague la tarifa de €1.00.",
  "Could not agree to that request.": "No se pudo aceptar esa solicitud.",
  "You agreed. Your neighbor pays €1.00 to complete it.": "Aceptaste. Tu vecino paga €1.00 para completarlo.",
  "You both agreed — the item is reserved for your neighbor.": "Ambos aceptaron — el artículo está reservado para tu vecino.",
  "Loading your items…": "Cargando tus artículos…",
  Live: "Activo",
  "Remove": "Eliminar",
  "Could not remove that listing.": "No se pudo eliminar ese artículo.",
  "Listing removed.": "Artículo eliminado.",
  "You haven't shared anything yet.": "Todavía no has compartido nada.",
  "Share a new item": "Compartir un nuevo artículo",

  "Extra claim": "Reclamación extra",
  "One-off €1.00 fee": "Tarifa única de €1.00",
  "You've used your": "Has usado tus",
  "free claims this month": "reclamaciones gratis este mes",
  "Receiving is free for": "Recibir es gratis para",
  "items every month. Each extra item you claim costs €": "artículos cada mes. Cada artículo extra que reclames cuesta €",
  "— sharing your own items is always free.": "— compartir tus propios artículos siempre es gratis.",
  "Total due": "Total a pagar",
  "This claim is already confirmed.": "Esta reclamación ya está confirmada.",
  "Pay": "Pagar",
  "Payment is handled securely by our payment provider. Your card details never touch Hey Neighbor.":
    "El pago se procesa de forma segura por nuestro proveedor de pagos. Tus datos de tarjeta nunca llegan a Hey Neighbor.",
  "Payment is processing — we'll confirm your claim as soon as it settles.":
    "El pago se está procesando — confirmaremos tu reclamación en cuanto se complete.",
  "Payment complete — your claim is confirmed.": "Pago completado — tu reclamación está confirmada.",
  "Payment could not be confirmed.": "No se pudo confirmar el pago.",
  "Checkout could not be started.": "No se pudo iniciar el pago.",
};

const dictionaries: Record<Lang, Dict> = { en: {}, es };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "es" || stored === "en") {
        setLangState(stored);
        return;
      }
      if (navigator.language?.toLowerCase().startsWith("es")) setLangState("es");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string) => dictionaries[lang][key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useI18n() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}
