const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

const moduleSource = `package com.fishingspot.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class AndroidLocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "AndroidLocationModule"

  @ReactMethod
  fun getCurrentLocation(timeoutMs: Double, promise: Promise) {
    if (!hasLocationPermission()) {
      promise.reject("LOCATION_PERMISSION_DENIED", "Location permission is not granted")
      return
    }

    val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val providers = listOf(
      LocationManager.GPS_PROVIDER,
      LocationManager.NETWORK_PROVIDER,
      LocationManager.PASSIVE_PROVIDER
    ).filter { provider ->
      runCatching { locationManager.isProviderEnabled(provider) }.getOrDefault(false)
    }

    if (providers.isEmpty()) {
      promise.reject("LOCATION_PROVIDER_DISABLED", "No Android location provider is enabled")
      return
    }

    val lastKnown = providers
      .mapNotNull { provider -> runCatching { locationManager.getLastKnownLocation(provider) }.getOrNull() }
      .filter { isUsableLocation(it) }
      .maxByOrNull { it.time }

    if (lastKnown != null && System.currentTimeMillis() - lastKnown.time < 10 * 60 * 1000) {
      promise.resolve(toMap(lastKnown, "lastKnown:\${lastKnown.provider}"))
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var finished = false
    val listeners = mutableListOf<LocationListener>()

    fun finish(location: Location?, errorCode: String? = null, errorMessage: String? = null) {
      if (finished) return
      finished = true
      listeners.forEach { listener ->
        runCatching { locationManager.removeUpdates(listener) }
      }
      if (location != null && isUsableLocation(location)) {
        promise.resolve(toMap(location, location.provider ?: "android"))
      } else {
        promise.reject(errorCode ?: "LOCATION_UNAVAILABLE", errorMessage ?: "Android system location unavailable")
      }
    }

    providers.forEach { provider ->
      val listener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
          finish(location)
        }

        @Deprecated("Deprecated in Java")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit

        override fun onProviderEnabled(provider: String) = Unit
        override fun onProviderDisabled(provider: String) = Unit
      }
      listeners.add(listener)
      runCatching {
        locationManager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
      }.onFailure {
        if (listeners.size == providers.size && !finished) {
          finish(lastKnown, "LOCATION_REQUEST_FAILED", it.message ?: "Android location request failed")
        }
      }
    }

    handler.postDelayed({
      finish(lastKnown, "LOCATION_TIMEOUT", "Android system location timeout")
    }, timeoutMs.toLong().coerceIn(3000L, 30000L))
  }

  private fun hasLocationPermission(): Boolean {
    val fine = reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    return fine || coarse
  }

  private fun isUsableLocation(location: Location?): Boolean {
    if (location == null) return false
    if (location.latitude == 0.0 && location.longitude == 0.0) return false
    return location.latitude in -90.0..90.0 && location.longitude in -180.0..180.0
  }

  private fun toMap(location: Location, source: String): WritableMap {
    return Arguments.createMap().apply {
      putDouble("latitude", location.latitude)
      putDouble("longitude", location.longitude)
      putDouble("accuracy", location.accuracy.toDouble())
      putString("source", source)
      putDouble("timestamp", location.time.toDouble())
    }
  }
}
`;

const packageSource = `package com.fishingspot.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AndroidLocationPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(AndroidLocationModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;

function withAndroidSystemLocation(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const projectRoot = config.modRequest.platformProjectRoot;
    const packageDir = path.join(projectRoot, 'app/src/main/java/com/fishingspot/app');
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'AndroidLocationModule.kt'), moduleSource);
    fs.writeFileSync(path.join(packageDir, 'AndroidLocationPackage.kt'), packageSource);

    const mainApplicationPath = path.join(packageDir, 'MainApplication.kt');
    let mainApplication = fs.readFileSync(mainApplicationPath, 'utf8');
    if (!mainApplication.includes('AndroidLocationPackage()')) {
      mainApplication = mainApplication.replace(
        'return PackageList(this).packages',
        [
          'val packages = PackageList(this).packages',
          '            packages.add(AndroidLocationPackage())',
          '            return packages',
        ].join('\n'),
      );
      fs.writeFileSync(mainApplicationPath, mainApplication);
    }
    return config;
  }]);
}

module.exports = withAndroidSystemLocation;
