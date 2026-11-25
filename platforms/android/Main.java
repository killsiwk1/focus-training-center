package studio.focuspractice.center;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class Main extends Activity {
    private static final String HOST="appassets.androidplatform.net";
    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private boolean saving;
    private File pending(){return new File(getCacheDir(),"pending-export");}
    private void message(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        saving=state!=null && state.getBoolean("saving");
        web=new WebView(this);
        web.setOnApplyWindowInsetsListener((v,insets)->{
            v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(web);
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){return !local(req.getUrl());}
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){
                Uri u=req.getUrl();
                if(local(u)){
                    String path=u.getPath().substring(1);
                    if(path.isEmpty())path="index.html";
                    if(path.matches("(games/)?[a-zA-Z0-9._-]+")&&!path.contains("..")){
                        try{
                            String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":path.endsWith(".png")?"image/png":path.endsWith(".html")?"text/html":"application/json";
                            return new WebResourceResponse(mime,mime.equals("image/png")?null:"UTF-8",getAssets().open(path));
                        }catch(IOException ignored){}
                    }
                }
                return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(chooser!=null)chooser.onReceiveValue(null);
                chooser=cb;
                try{startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"),1);}
                catch(Exception e){cb.onReceiveValue(null);chooser=null;message("无法打开系统文件选择器");}
                return true;
            }
        });
        web.addJavascriptInterface(new FilesBridge(),"AndroidFiles");
        web.loadUrl("https://"+HOST+"/");
    }
    private boolean local(Uri u){return "https".equals(u.getScheme())&&HOST.equals(u.getAuthority())&&u.getPath()!=null&&u.getPath().startsWith("/");}
    public class FilesBridge {
        @JavascriptInterface public void save(String name,String data,String type){
            runOnUiThread(()->{
                if(saving)return;
                try(FileOutputStream out=new FileOutputStream(pending())){
                    out.write(data.getBytes(StandardCharsets.UTF_8));
                }catch(IOException e){message("导出准备失败");return;}
                saving=true;
                try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(name.endsWith(".csv")?"text/csv":"application/json").putExtra(Intent.EXTRA_TITLE,name),2);}
                catch(Exception e){saving=false;pending().delete();message("无法打开保存位置");}
            });
        }
    }
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putBoolean("saving",saving);}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        Uri uri=result==RESULT_OK&&data!=null?data.getData():null;
        if(request==1&&chooser!=null){chooser.onReceiveValue(uri==null?null:new Uri[]{uri});chooser=null;}
        if(request==2){saving=false;
            if(uri!=null)try(InputStream in=new FileInputStream(pending());OutputStream out=getContentResolver().openOutputStream(uri,"wt")){
                byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);out.flush();message("文件已保存");
            }catch(Exception e){message("保存失败，请重新导出");}
            pending().delete();
        }
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
}
