#import <Cocoa/Cocoa.h>
#import <sys/socket.h>
#import <netinet/in.h>
#import <unistd.h>
@interface Runner:NSObject<NSApplicationDelegate>
@property(strong) NSStatusItem *item;
@end
@implementation Runner
-(void)openHome {[[NSWorkspace sharedWorkspace] openURL:[NSURL URLWithString:@"http://127.0.0.1:8765/"]];}
-(void)applicationDidFinishLaunching:(NSNotification*)n {
 int fd=socket(AF_INET,SOCK_STREAM,0),yes=1; setsockopt(fd,SOL_SOCKET,SO_REUSEADDR,&yes,sizeof yes);
 struct sockaddr_in a={0};a.sin_family=AF_INET;a.sin_addr.s_addr=htonl(INADDR_LOOPBACK);a.sin_port=htons(8765);
 if(bind(fd,(struct sockaddr*)&a,sizeof a)||listen(fd,64)){NSAlert *al=[NSAlert new];al.messageText=@"无法启动：本机端口 8765 已被占用";[al runModal];[NSApp terminate:nil];return;}
 NSString *root=[NSBundle.mainBundle.resourcePath stringByAppendingPathComponent:@"site"];
 dispatch_async(dispatch_get_global_queue(0,0),^{for(;;){int c=accept(fd,NULL,NULL);if(c<0)continue;dispatch_async(dispatch_get_global_queue(0,0),^{@autoreleasepool{
 int one=1;setsockopt(c,SOL_SOCKET,SO_NOSIGPIPE,&one,sizeof one);struct timeval tv={5,0};setsockopt(c,SOL_SOCKET,SO_RCVTIMEO,&tv,sizeof tv);setsockopt(c,SOL_SOCKET,SO_SNDTIMEO,&tv,sizeof tv);
 char buf[8192];ssize_t k=recv(c,buf,sizeof buf,0);if(k>0){NSString *req=[[NSString alloc]initWithBytes:buf length:k encoding:NSASCIIStringEncoding];NSArray *parts=[req componentsSeparatedByString:@" "];if(parts.count>=2){NSString *p=[parts[1] componentsSeparatedByString:@"?"].firstObject;if([p isEqual:@"/"])p=@"/index.html";BOOL safe=[p rangeOfString:@"^/(games/)?[a-zA-Z0-9_-]+[.][a-zA-Z0-9]+$" options:NSRegularExpressionSearch].location!=NSNotFound;NSData *body=safe?[NSData dataWithContentsOfFile:[root stringByAppendingString:p]]:nil;
 NSString *mime=@{@"html":@"text/html; charset=utf-8",@"js":@"text/javascript",@"css":@"text/css",@"png":@"image/png",@"webmanifest":@"application/manifest+json"}[p.pathExtension]?:@"application/octet-stream";
 NSMutableData *packet=[[[NSString stringWithFormat:@"HTTP/1.1 %@\r\nContent-Type: %@\r\nContent-Length: %lu\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n",body?@"200 OK":@"404 Not Found",mime,(unsigned long)body.length] dataUsingEncoding:NSUTF8StringEncoding] mutableCopy];if(body&&![parts[0] isEqual:@"HEAD"])[packet appendData:body];size_t sent=0;while(sent<packet.length){ssize_t w=send(c,(const char*)packet.bytes+sent,packet.length-sent,0);if(w<=0)break;sent+=w;}}}close(c);}});}});
 self.item=[[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];self.item.button.title=@"专注训练";NSMenu *m=[NSMenu new];NSMenuItem *o=[m addItemWithTitle:@"打开训练中心" action:@selector(openHome) keyEquivalent:@""];o.target=self;[m addItemWithTitle:@"退出训练中心" action:@selector(terminate:) keyEquivalent:@"q"];self.item.menu=m;[self openHome];}
-(BOOL)applicationShouldHandleReopen:(NSApplication*)app hasVisibleWindows:(BOOL)visible{[self openHome];return NO;}
@end
int main(){@autoreleasepool{NSApplication *app=[NSApplication sharedApplication];__attribute__((objc_precise_lifetime)) Runner *r=[Runner new];app.delegate=r;[app run];}}
