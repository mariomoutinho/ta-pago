package br.com.coletivopindorama.tapago;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import android.webkit.CookieManager;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class PushService extends FirebaseMessagingService {
    static final String CHANNEL = "tapago_news_sound_v2";
    static void channel(Context context) {
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Novidades do Tá Pago", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Cadastros recebidos, treinos concluídos e feedbacks dos alunos.");
        channel.enableVibration(true);
        channel.setSound(Uri.parse("android.resource://"+context.getPackageName()+"/raw/tapago_alert"),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
    @Override public void onNewToken(String token) {
        getSharedPreferences("push", MODE_PRIVATE).edit().putString("token", token).apply();
        refreshRegistration(token);
        MainActivity.pushChanged();
    }
    private void refreshRegistration(String token) {
        var preferences = getSharedPreferences("push", MODE_PRIVATE);
        if (!preferences.getBoolean("enabled", false)) return;
        String expected = preferences.getString("binding", ""), cookie = CookieManager.getInstance().getCookie(NavigationPolicy.ORIGIN + "/api");
        if (cookie == null || expected.isEmpty()) return;
        HttpURLConnection connection = null;
        try {
            JSONObject body = new JSONObject().put("installation", preferences.getString("installation", "")).put("token", token);
            connection = (HttpURLConnection) new URL(NavigationPolicy.ORIGIN + "/api/notifications/android/subscribe").openConnection();
            connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(3000);connection.setReadTimeout(5000);
            connection.setRequestMethod("POST");connection.setDoOutput(true);
            connection.setRequestProperty("Cookie", cookie);connection.setRequestProperty("X-Requested-With", "TaPago");connection.setRequestProperty("Content-Type", "application/json");
            try (var output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            if (connection.getResponseCode() == 200) {
                String response;
                try (var input = connection.getInputStream(); var bytes = new java.io.ByteArrayOutputStream()) {
                    byte[] buffer = new byte[1024];int length;
                    while ((length = input.read(buffer)) != -1) { if (bytes.size()+length > 4096) return;bytes.write(buffer,0,length); }
                    response = bytes.toString(StandardCharsets.UTF_8.name());
                }
                if (!expected.equals(new JSONObject(response).optString("binding")) && expected.equals(preferences.getString("binding", "")))
                    preferences.edit().putBoolean("enabled", false).remove("binding").apply();
            }
        } catch (Exception ignored) { /* Reconciliar novamente ao abrir/retomar, inclusive se a sessão expirou. */ }
        finally { if (connection != null) connection.disconnect(); }
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        Map<String,String> data = message.getData();
        var preferences = getSharedPreferences("push", MODE_PRIVATE);
        if (!preferences.getBoolean("enabled", false) || !PushPolicy.binding(preferences.getString("binding", ""), data.get("binding"))) return;
        show(this, data.get("id"), data.get("title"), data.get("body"));
        MainActivity.pushChanged();
    }
    static void show(Context context, String id, String title, String body) {
        channel(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (!manager.areNotificationsEnabled() || manager.getNotificationChannel(CHANNEL).getImportance() == NotificationManager.IMPORTANCE_NONE) return;
        Intent intent = new Intent(context, MainActivity.class).putExtra("notificationId", id == null ? "" : id);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int key = id == null ? 1 : id.hashCode();
        PendingIntent click = PendingIntent.getActivity(context, key, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new Notification.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification).setColor(Color.rgb(255, 54, 88))
            .setContentTitle(title == null ? "Novidade no Tá Pago" : title)
            .setContentText(body == null ? "Toque para abrir as novidades." : body)
            .setContentIntent(click).setAutoCancel(true).setCategory(Notification.CATEGORY_SOCIAL)
            .setVisibility(Notification.VISIBILITY_PRIVATE).build();
        manager.notify(key, notification);
    }
}
