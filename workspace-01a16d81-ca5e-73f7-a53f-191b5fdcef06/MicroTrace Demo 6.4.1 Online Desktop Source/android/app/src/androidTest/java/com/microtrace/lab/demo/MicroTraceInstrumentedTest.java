package com.microtrace.lab.microtracedemo;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Run on a connected Android device/emulator after building and syncing assets. */
@RunWith(AndroidJUnit4.class)
public class MicroTraceInstrumentedTest {
    private Context appContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    private String asset(String name) throws Exception {
        StringBuilder text = new StringBuilder();
        try (InputStream input = appContext().getAssets().open(name);
             BufferedReader reader = new BufferedReader(new InputStreamReader(input, "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line).append('\n');
        }
        return text.toString();
    }

    @Test public void usesTheCorrectApplicationId() {
        assertEquals("com.microtrace.lab.microtracedemo", appContext().getPackageName());
    }

    @Test public void bundlesTheReactEntryPoint() throws Exception {
        assertTrue(asset("public/index.html").contains("id=\"root\""));
        assertTrue(asset("public/index.html").contains("./assets/"));
    }

    @Test public void bundlesTheNativeConfiguration() throws Exception {
        assertTrue(asset("capacitor.config.json").contains("com.microtrace.lab.microtracedemo"));
        assertTrue(asset("capacitor.config.json").contains("androidScheme"));
    }
}
