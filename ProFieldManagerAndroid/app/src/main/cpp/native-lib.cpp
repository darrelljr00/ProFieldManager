#include <jni.h>
#include <string>
#include <android/log.h>

#define LOG_TAG "ProFieldManager"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

extern "C" JNIEXPORT jstring JNICALL
Java_com_profieldmanager_MainActivity_stringFromJNI(
        JNIEnv* env,
        jobject /* this */) {
    std::string hello = "Pro Field Manager Native Library - 16KB Page Aligned";
    LOGI("Native library loaded successfully with 16KB page alignment");
    return env->NewStringUTF(hello.c_str());
}