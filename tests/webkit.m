#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
@interface Tester : NSObject<WKNavigationDelegate>
@property(strong) WKWebView *web;
@property(strong) NSWindow *window;
@end
@implementation Tester
-(void)webView:(WKWebView *)web didFinishNavigation:(WKNavigation *)navigation {
 NSString *script=[NSString stringWithContentsOfFile:@"tests/webkit-script.txt" encoding:NSUTF8StringEncoding error:nil];
 [web callAsyncJavaScript:script arguments:@{} inFrame:nil inContentWorld:[WKContentWorld pageWorld] completionHandler:^(id value,NSError *error) {
   if(error){NSLog(@"%@",error);exit(1);} NSLog(@"%@",value);exit(0);
 }];
}
@end
int main(){@autoreleasepool{
 [NSApplication sharedApplication];[NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
 Tester *tester=[Tester new];WKWebViewConfiguration *config=[WKWebViewConfiguration new];config.websiteDataStore=[WKWebsiteDataStore nonPersistentDataStore];
 NSRect rect=NSMakeRect(0,0,390,840);tester.window=[[NSWindow alloc] initWithContentRect:rect styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];
 tester.web=[[WKWebView alloc] initWithFrame:rect configuration:config];tester.web.navigationDelegate=tester;tester.window.contentView=tester.web;
 [tester.window orderBack:nil];[tester.web loadRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"http://127.0.0.1:8765/"]]];
 dispatch_after(dispatch_time(DISPATCH_TIME_NOW,75*NSEC_PER_SEC),dispatch_get_main_queue(),^{NSLog(@"测试超时");exit(2);});[NSApp run];return 0;}}
