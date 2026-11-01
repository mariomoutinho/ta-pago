package br.com.coletivopindorama.tapago;

import android.app.NotificationManager;
import android.content.Context;
import android.app.Instrumentation;
import android.app.Activity;
import android.os.Bundle;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

/** Executar manualmente em emulador isolado; não usa contas nem cadastros de alunos. */
public class PushDeliveryTest extends Instrumentation {
    private String action;
    @Override public void onCreate(Bundle arguments) { super.onCreate(arguments);action=arguments.getString("action", "prepare");start(); }
    @Override public void onStart() {
        Bundle result = new Bundle();
        try { if ("prepare".equals(action)) testPrepareDevice(); else if ("verify".equals(action)) testVerifyDeliveryAndClick(); else throw new IllegalArgumentException();result.putString("passed", "true");finish(Activity.RESULT_OK,result); }
        catch (Exception failure) { result.putString("passed", "false");result.putString("error",failure.getClass().getSimpleName());finish(Activity.RESULT_CANCELED,result); }
    }
    private static void check(boolean value) { if (!value) throw new IllegalStateException("Verificação de integração não concluída"); }
    public void testPrepareDevice() throws Exception {
        check(BuildConfig.PUSH_CONFIGURED);
        Context context = getTargetContext();
        PushService.channel(context);
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();messaging.setAutoInitEnabled(true);
        String token = Tasks.await(messaging.getToken(), 45, TimeUnit.SECONDS);
        String binding = UUID.randomUUID().toString().replace("-", "");
        context.getSharedPreferences("push", Context.MODE_PRIVATE).edit().putBoolean("enabled", true).putString("binding", binding).putString("token", token).commit();
        JSONObject state = new JSONObject().put("token", token).put("binding", binding);
        // Exportação temporária apenas no emulador isolado; remover após o teste, nunca registrar nos logs.
        try (var output = new java.io.FileOutputStream(new File(context.getExternalFilesDir(null), "push-device.json"))) { output.write(state.toString().getBytes(StandardCharsets.UTF_8)); }
    }
    public void testVerifyDeliveryAndClick() throws Exception {
        Context context = getTargetContext();
        var notifications = context.getSystemService(NotificationManager.class).getActiveNotifications();
        check(notifications.length == 1);
        check("Teste do Tá Pago".equals(notifications[0].getNotification().extras.getString("android.title")));
        var monitor = addMonitor(MainActivity.class.getName(), null, false);
        notifications[0].getNotification().contentIntent.send();
        var activity = waitForMonitorWithTimeout(monitor, 10000);
        check(activity != null && activity.getIntent().hasExtra("notificationId"));
        removeMonitor(monitor);
        context.getSharedPreferences("push", Context.MODE_PRIVATE).edit().putBoolean("enabled", false).remove("binding").commit();
        context.getSystemService(NotificationManager.class).cancelAll();
        new File(context.getExternalFilesDir(null), "push-device.json").delete();
    }
}
