package expo.modules.btprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

@SuppressLint("MissingPermission")
class BtPrinterModule : Module() {
  private val spp: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
  private val permMsg = "Izin Bluetooth ditolak. Aktifkan izin 'Perangkat sekitar' untuk DSKos"

  private fun ctx(): Context = appContext.reactContext ?: throw Exception("Aplikasi belum siap")

  private fun has(perm: String): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
      ctx().checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED

  private fun adapter(): BluetoothAdapter {
    if (!has(Manifest.permission.BLUETOOTH_CONNECT)) throw Exception(permMsg)
    val a = (ctx().getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      ?: throw Exception("HP ini tidak mendukung Bluetooth")
    if (!a.isEnabled) throw Exception("Bluetooth belum aktif. Nyalakan Bluetooth terlebih dahulu")
    return a
  }

  private fun open(device: BluetoothDevice): BluetoothSocket {
    try {
      val s = device.createRfcommSocketToServiceRecord(spp)
      s.connect()
      return s
    } catch (e: SecurityException) {
      throw e
    } catch (e: Exception) {
      val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
      val s = m.invoke(device, 1) as BluetoothSocket
      s.connect()
      return s
    }
  }

  override fun definition() = ModuleDefinition {
    Name("BtPrinter")

    AsyncFunction("getPairedDevices") {
      val a = adapter()
      try {
        (a.bondedDevices ?: emptySet()).map { mapOf("name" to (it.name ?: it.address), "address" to it.address) }
      } catch (e: SecurityException) {
        throw Exception(permMsg)
      }
    }

    AsyncFunction("print") { address: String, data: String ->
      val a = adapter()
      // cancelDiscovery() needs BLUETOOTH_SCAN on Android 12+. The app never starts discovery,
      // so only call it when discovery is running AND the scan permission was granted.
      if (has(Manifest.permission.BLUETOOTH_SCAN)) {
        try { if (a.isDiscovering) a.cancelDiscovery() } catch (_: Throwable) {}
      }
      val socket = try {
        open(a.getRemoteDevice(address))
      } catch (e: SecurityException) {
        throw Exception(permMsg)
      } catch (e: Throwable) {
        throw Exception("Tidak bisa terhubung ke printer. Pastikan printer menyala dan sudah dipasangkan (pair)")
      }
      try {
        val out = socket.outputStream
        out.write(Base64.decode(data, Base64.DEFAULT))
        out.flush()
        Thread.sleep(1200)
      } catch (e: Throwable) {
        throw Exception("Gagal mengirim data ke printer. Coba lagi")
      } finally {
        try { socket.close() } catch (_: Throwable) {}
      }
    }
  }
}
