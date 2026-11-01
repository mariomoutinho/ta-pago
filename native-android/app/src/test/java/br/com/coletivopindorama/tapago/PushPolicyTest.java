package br.com.coletivopindorama.tapago;

import org.junit.Test;
import static org.junit.Assert.*;

public class PushPolicyTest {
    @Test public void acceptsOnlyCurrentAccountBinding() {
        String binding = "0123456789abcdef0123456789abcdef";
        assertTrue(PushPolicy.binding(binding, binding));
        assertFalse(PushPolicy.binding("", ""));
        assertFalse(PushPolicy.binding(null, binding));
        assertFalse(PushPolicy.binding(binding, "abcdef0123456789abcdef0123456789"));
    }
    @Test public void opensSpecificNewsThroughAuthenticatedResolver() {
        assertEquals(NavigationPolicy.ORIGIN + "/notificacao?aviso=completion%3Atest-123", PushPolicy.target("completion:test-123"));
        assertEquals(NavigationPolicy.ORIGIN + "/notificacao?aviso=enrollment-123", PushPolicy.target("enrollment-123"));
    }
    @Test public void refusesArbitraryDestinations() {
        for (String value : new String[]{null, "", "https://example.test", "../admin", "id&other=1", "id#fragment"})
            assertEquals(NavigationPolicy.ORIGIN + "/notificacao", PushPolicy.target(value));
    }
}
