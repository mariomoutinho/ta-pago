package br.com.coletivopindorama.tapago;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 10, SAVE_FILE = 11;
    private WebView web;
    private FrameLayout root, error;
    private ProgressBar progress;
    private ValueCallback<Uri[]> chooser;
    private byte[] download;
    private View video;
    private WebChromeClient.CustomViewCallback videoCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this); root.setBackgroundColor(Color.BLACK);
        web = new WebView(this); root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        progress = new ProgressBar(this); FrameLayout.LayoutParams centered = new FrameLayout.LayoutParams(80,80,Gravity.CENTER); root.addView(progress,centered);
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view,insets) -> {
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard=insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom)); return insets;
            });
        }
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(true);settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString()+" TaPagoAndroid/"+BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(!request.isForMainFrame())return false;return navigate(request.getUrl().toString());
            }
            @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);CookieManager.getInstance().flush();if(NavigationPolicy.internal(url))installDownloads();}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError failure){if(request.isForMainFrame())showError();}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError failure){handler.cancel();showError();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
                try{Intent intent=params.createIntent();intent.setAction(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(intent,PICK_FILE);}catch(Exception failure){chooser.onReceiveValue(null);chooser=null;Toast.makeText(MainActivity.this,"Não foi possível abrir os arquivos.",Toast.LENGTH_LONG).show();}return true;
            }
            @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean gesture,Message message){
                if(!gesture)return false;
                WebView popup=new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){String url=request.getUrl().toString();if(NavigationPolicy.internal(url))web.loadUrl(url);else openExternal(url);view.destroy();return true;}});
                ((WebView.WebViewTransport)message.obj).setWebView(popup);message.sendToTarget();return true;
            }
            @Override public void onShowCustomView(View view,CustomViewCallback callback){if(video!=null){callback.onCustomViewHidden();return;}video=view;videoCallback=callback;root.addView(view,new FrameLayout.LayoutParams(-1,-1));web.setVisibility(View.GONE);}
            @Override public void onHideCustomView(){hideVideo();}
        });
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))WebViewCompat.addWebMessageListener(web,"TaPagoAndroid",Collections.singleton(NavigationPolicy.ORIGIN),(view,message,source,isMainFrame,reply)->{
            if(!isMainFrame||!NavigationPolicy.internal(source.toString()))return;
            try{JSONObject data=new JSONObject(message.getData());if("download".equals(data.optString("action"))){String encoded=data.getString("data");if(encoded.length()>12*1024*1024)throw new IllegalArgumentException();byte[] bytes=android.util.Base64.decode(encoded,android.util.Base64.DEFAULT);save(bytes,data.optString("name","exportacao-tapago.json"),data.optString("mime","application/octet-stream"));}else if("open".equals(data.optString("action")))openExternal(data.getString("url"));}catch(Exception ignored){Toast.makeText(this,"Não foi possível concluir a ação.",Toast.LENGTH_LONG).show();}
        });
        web.setDownloadListener((url,userAgent,disposition,mime,length)->{if(NavigationPolicy.internal(url))download(url,mime);else if(!url.startsWith("blob:"))openExternal(url);});
        if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0,()->back());
        if(state==null||web.restoreState(state)==null)web.loadUrl(startUrl(getIntent()));
    }
    private String startUrl(Intent intent){String value=intent.getDataString();return value!=null&&value.startsWith("tapago:")?NavigationPolicy.appLink(value):NavigationPolicy.ORIGIN+"/";}
    private boolean navigate(String url){if(NavigationPolicy.internal(url))return false;openExternal(url);return true;}
    private void openExternal(String url){if(!NavigationPolicy.external(url))return;try{Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(url));intent.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(intent);}catch(Exception failure){Toast.makeText(this,"Nenhum aplicativo disponível para abrir este link.",Toast.LENGTH_LONG).show();}}
    private void showError(){if(error!=null)return;progress.setVisibility(View.GONE);error=new FrameLayout(this);error.setBackgroundColor(Color.BLACK);LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setGravity(Gravity.CENTER);content.setPadding(32,32,32,32);TextView text=new TextView(this);text.setText(R.string.connection_error);text.setTextColor(Color.WHITE);text.setGravity(Gravity.CENTER);content.addView(text);Button retry=new Button(this);retry.setText(R.string.retry);retry.setOnClickListener(view->{root.removeView(error);error=null;progress.setVisibility(View.VISIBLE);web.loadUrl(NavigationPolicy.ORIGIN+"/");});content.addView(retry);error.addView(content,new FrameLayout.LayoutParams(-1,-1));root.addView(error,new FrameLayout.LayoutParams(-1,-1));}
    private void hideVideo(){if(video==null)return;root.removeView(video);video=null;web.setVisibility(View.VISIBLE);videoCallback.onCustomViewHidden();videoCallback=null;}
    private void back(){if(video!=null)hideVideo();else if(web.canGoBack())web.goBack();else finish();}
    // Legado para API 26–32; API 33+ usa o callback registrado no dispatcher nativo.
    @SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed(){back();}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);web.loadUrl(startUrl(intent));}
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);web.saveState(out);}
    @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();}
    @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==PICK_FILE&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,intent));chooser=null;}if(request==SAVE_FILE&&result==RESULT_OK&&intent!=null&&download!=null){byte[] bytes=download;download=null;Uri uri=intent.getData();new Thread(()->{try(OutputStream output=getContentResolver().openOutputStream(uri)){output.write(bytes);runOnUiThread(()->Toast.makeText(this,"Arquivo salvo.",Toast.LENGTH_SHORT).show());}catch(Exception failure){runOnUiThread(()->Toast.makeText(this,"Não foi possível salvar o arquivo.",Toast.LENGTH_LONG).show());}}).start();}}
    private void save(byte[] bytes,String name,String mime){download=bytes;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime);intent.putExtra(Intent.EXTRA_TITLE,name.replaceAll("[^\\p{L}\\p{N}._ -]","_"));startActivityForResult(intent,SAVE_FILE);}
    private void download(String value,String mime){new Thread(()->{HttpURLConnection connection=null;try{connection=(HttpURLConnection)new URL(value).openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);String cookie=CookieManager.getInstance().getCookie(value);if(cookie!=null)connection.setRequestProperty("Cookie",cookie);if(connection.getResponseCode()!=200)throw new IllegalStateException();ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(InputStream input=connection.getInputStream()){byte[] buffer=new byte[8192];int size;while((size=input.read(buffer))!=-1){if(bytes.size()+size>8*1024*1024)throw new IllegalStateException();bytes.write(buffer,0,size);}}byte[] result=bytes.toByteArray();runOnUiThread(()->save(result,"exportacao-tapago.json",mime==null?"application/octet-stream":mime));}catch(Exception failure){runOnUiThread(()->Toast.makeText(this,"Não foi possível baixar o arquivo.",Toast.LENGTH_LONG).show());}finally{if(connection!=null)connection.disconnect();}}).start();}
    private void installDownloads(){
        web.evaluateJavascript("(function(){if(!window.TaPagoAndroid||window.__tapagoAndroidReady)return;window.__tapagoAndroidReady=true;const send=data=>window.TaPagoAndroid.postMessage(JSON.stringify(data));const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.href.startsWith('blob:')){const name=this.download||'exportacao-tapago.json';fetch(this.href).then(r=>r.blob()).then(blob=>{if(blob.size>8388608)throw Error('size');const reader=new FileReader();reader.onload=()=>send({action:'download',name,mime:blob.type||'application/octet-stream',data:String(reader.result).split(',')[1]});reader.readAsDataURL(blob);});return;}return click.call(this);};window.open=function(url){let target=typeof url==='string'?url:'';let closed=false;const location={replace(value){target=value;if(!closed)send({action:'open',url:target});}};const popup={closed:false,opener:null,location,close(){closed=true;this.closed=true;}};if(target&&target!=='about:blank')send({action:'open',url:target});return popup;};})()",null);
    }
}
