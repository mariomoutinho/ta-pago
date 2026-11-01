package br.com.coletivopindorama.tapago;
import org.junit.Test;
import static org.junit.Assert.*;
public class NavigationPolicyTest {
    @Test public void permitsOnlyOwnHttpsOrigin(){
        assertTrue(NavigationPolicy.internal(NavigationPolicy.ORIGIN+"/alunos/cadastros"));
        for(String value:new String[]{"http://tapago.coletivopindorama.com.br/","https://tapago.coletivopindorama.com.br.evil.test/","https://user@tapago.coletivopindorama.com.br/","https://tapago.coletivopindorama.com.br:8443/","javascript:alert(1)","file:///secret"})assertFalse(value,NavigationPolicy.internal(value));
    }
    @Test public void deepLinksStayWithinSite(){
        assertEquals(NavigationPolicy.ORIGIN+"/notificacao?aviso=teste",NavigationPolicy.appLink("tapago://app/notificacao?aviso=teste"));
        assertEquals(NavigationPolicy.ORIGIN+"/",NavigationPolicy.appLink("tapago://evil/notificacao"));
        assertEquals(NavigationPolicy.ORIGIN+"/",NavigationPolicy.appLink("tapago://app//evil.test"));
    }
    @Test public void blocksUntrustedExternalSchemes(){assertTrue(NavigationPolicy.external("https://wa.me/5511999990000"));assertFalse(NavigationPolicy.external("intent://bad"));assertFalse(NavigationPolicy.external("content://private"));}
}
