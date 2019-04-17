# RCTWebRTCDemo2

## Configuration (Works on iOS & Android)
**react: 16.8.3**

**react-native: 0.59.4**

**react-native-webrtc: 1.67.1**

## Usage
- Clone the repository, run `npm install`.  
- For iOS, run the project on Xcode.  
- For Android, run `react-native run-android` in the directory.  

## Native Code Changes (*Android*)
- Because this is version **1.67.1** you must change the native android code in the module. 
- go to ```node_modules/react-native-webrtc/android/src/main/java/com/oney/WebRTCModule/WebRTCModule.java```

```java
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.module.annotations.ReactModule; // <-- Add this

import java.util.ArrayList;
import java.util.HashMap;

import org.webrtc.*;

@ReactModule(name = "WebRTCModule") // <-- Add this
public class WebRTCModule extends ReactContextBaseJavaModule {
    static final String TAG = WebRTCModule.class.getCanonicalName();
```

## Instructions
- For this to work you need to create the server, go to : [RCTWebRTCDemo-server](https://github.com/DimitrisTzimikas/RCTWebRTCDemo-server) and follow the instructions.

- After you create the server and deploy it with ngrok copy the link, something like that "https://a4cd7858.ngrok.io" and paste it to ```RCTWebRCTDemo2/src/App.js``` 
```javascript
const url = 'paste_it_here';
```
- It must look like than
```javascript
const url = 'https://a4cd7858.ngrok.io/';
```

# Note 
- Whenever you change the ngrok link you must follow the same routine. 
