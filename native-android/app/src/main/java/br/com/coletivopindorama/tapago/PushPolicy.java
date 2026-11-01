package br.com.coletivopindorama.tapago;

/** Dados recebidos nunca podem escolher uma URL ou outro aplicativo. */
final class PushPolicy {
    static boolean binding(String expected, String received) {
        return expected != null && expected.matches("[a-f0-9]{32}") && expected.equals(received);
    }
    static String target(String id) {
        return NavigationPolicy.ORIGIN + "/notificacao" + (id != null && id.matches("[a-zA-Z0-9_:-]{1,128}") ? "?aviso=" + id.replace(":", "%3A") : "");
    }
}
