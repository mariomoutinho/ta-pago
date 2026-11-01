package br.com.coletivopindorama.tapago;

import android.Manifest;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebViewFeature;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;
import org.json.JSONObject;

final class NativePush {
    static final int PERMISSION = 21;
    private final MainActivity activity;
    private final SharedPreferences preferences;
    private JavaScriptReplyProxy pending;
    private String pendingId;
    NativePush(MainActivity activity) {
        this.activity = activity;
        preferences = activity.getSharedPreferences("push", MainActivity.MODE_PRIVATE);
        if (!preferences.contains("installation")) preferences.edit().putString("installation", UUID.randomUUID().toString()).apply();
        PushService.channel(activity);
    }
    private boolean permission() {
        NotificationManager manager = activity.getSystemService(NotificationManager.class);
        return manager.areNotificationsEnabled() && manager.getNotificationChannel(PushService.CHANNEL).getImportance() != NotificationManager.IMPORTANCE_NONE;
    }
    private JSONObject state() throws Exception {
        return new JSONObject().put("supported", BuildConfig.PUSH_CONFIGURED).put("nativeApp", true)
            .put("enabled", BuildConfig.PUSH_CONFIGURED && permission() && preferences.getBoolean("enabled", false))
            .put("blocked", !permission() && preferences.getBoolean("asked", false))
            .put("wanted", preferences.getBoolean("enabled", false)).put("permission", permission())
            .put("installation", preferences.getString("installation", ""))
            .put("token", preferences.getString("token", ""));
    }
    private void reply(JavaScriptReplyProxy reply, String id, Object result, String error) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        try { JSONObject response = new JSONObject().put("id", id); if (error == null) response.put("result", result); else response.put("error", error); reply.postMessage(response.toString()); } catch (Exception ignored) { /* Documento já encerrado. */ }
    }
    void handle(JSONObject data, JavaScriptReplyProxy reply) throws Exception {
        String id = data.getString("id"), action = data.getString("action");
        if ("pushDisable".equals(action)) {
            JSONObject old = state();
            preferences.edit().putBoolean("enabled", false).remove("binding").apply();
            activity.getSystemService(NotificationManager.class).cancelAll();
            if (BuildConfig.PUSH_CONFIGURED) { FirebaseMessaging.getInstance().setAutoInitEnabled(false); FirebaseMessaging.getInstance().deleteToken(); }
            reply(reply, id, old, null); return;
        }
        if (!BuildConfig.PUSH_CONFIGURED) { reply(reply, id, state(), null); return; }
        if ("pushConfirm".equals(action)) {
            if (!data.getString("token").equals(preferences.getString("token", "")) || !data.getString("binding").matches("[a-f0-9]{32}")) throw new IllegalArgumentException();
            preferences.edit().putString("binding", data.getString("binding")).putBoolean("enabled", true).apply();
            reply(reply, id, state(), null); return;
        }
        if ("pushTest".equals(action)) {
            if (!state().getBoolean("enabled")) { reply(reply, id, null, "Ative as notificações neste aparelho antes de testar."); return; }
            PushService.show(activity, null, "Teste do Tá Pago", "As notificações nativas estão disponíveis neste aparelho.");
            reply(reply, id, true, null); return;
        }
        if ("pushEnable".equals(action) && Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            if (pending != null) { reply(reply, id, null, "Aguarde a solicitação de permissão anterior."); return; }
            pending = reply; pendingId = id; preferences.edit().putBoolean("asked", true).apply();
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION); return;
        }
        if ("pushEnable".equals(action) && !permission()) { reply(reply, id, null, "Permita as notificações do Tá Pago nas configurações do Android."); return; }
        if ("pushEnable".equals(action) || ("pushState".equals(action) && preferences.getBoolean("enabled", false) && permission())) token(reply, id);
        else reply(reply, id, state(), null);
    }
    private void token(JavaScriptReplyProxy reply, String id) {
        FirebaseMessaging messaging = FirebaseMessaging.getInstance(); messaging.setAutoInitEnabled(true);
        messaging.getToken().addOnCompleteListener(task -> {
            try {
                if (!task.isSuccessful()) { reply(reply, id, null, "Não foi possível conectar às notificações do Google. Confira a conexão e tente novamente."); return; }
                preferences.edit().putString("token", task.getResult()).apply(); reply(reply, id, state(), null);
            } catch (Exception ignored) { reply(reply, id, null, "Não foi possível verificar as notificações."); }
        });
    }
    void permissionResult() {
        JavaScriptReplyProxy reply = pending; String id = pendingId; pending = null; pendingId = null;
        if (reply == null) return;
        if (permission()) token(reply, id); else reply(reply, id, null, "Permita as notificações do Tá Pago nas configurações do Android.");
    }
}
