package br.com.coletivopindorama.tapago;

import java.net.URI;

final class NavigationPolicy {
    static final String ORIGIN = "https://tapago.coletivopindorama.com.br";
    static boolean internal(String value) {
        try {
            URI uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && "tapago.coletivopindorama.com.br".equalsIgnoreCase(uri.getHost())
                && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (Exception ignored) { return false; }
    }
    static String appLink(String value) {
        try {
            URI uri = URI.create(value);
            if (!"tapago".equals(uri.getScheme()) || !"app".equals(uri.getHost()) || uri.getUserInfo() != null) return ORIGIN + "/";
            String path = uri.getRawPath();
            if (path == null || !path.startsWith("/") || path.startsWith("//")) return ORIGIN + "/";
            return ORIGIN + path + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
        } catch (Exception ignored) { return ORIGIN + "/"; }
    }
    static boolean external(String value) {
        try {
            String scheme = URI.create(value).getScheme();
            return "https".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "whatsapp".equalsIgnoreCase(scheme);
        } catch (Exception ignored) { return false; }
    }
}
