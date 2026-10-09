package expo.modules.btprinter

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

@SuppressLint("MissingPermission")
class BtPrinterModule : Module() {
  private val spp: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

  private fun adapter(): BluetoothAdapter {
    val ctx = appContext.reactContext ?: throw Exception("Aplikasi belum siap")
    val a = (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      ?: throw Exception("HP ini tidak mendukung Bluetooth")
    if (!a.isEnabled) throw Exception("Bluetooth belum aktif. Nyalakan Bluetooth terlebih dahulu")
    return a
  }

  private fun open(device: BluetoothDevice): BluetoothSocket {
    try {
      val s = device.createRfcommSocketToServiceRecord(spp)
      s.connect()
      return s
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
      adapter().bondedDevices.map { mapOf("name" to (it.name ?: it.address), "address" to it.address) }
    }

    AsyncFunction("print") { address: String, data: String ->
      val a = adapter()
      try { a.cancelDiscovery() } catch (_: Exception) {}
      val socket = try {
        open(a.getRemoteDevice(address))
      } catch (e: Exception) {
        throw Exception("Tidak bisa terhubung ke printer. Pastikan printer menyala dan sudah dipasangkan (pair)")
      }
      try {
        val out = socket.outputStream
        out.write(Base64.decode(data, Base64.DEFAULT))
        out.flush()
        Thread.sleep(1200)
      } finally {
        try { socket.close() } catch (_: Exception) {}
      }
    }
  }
}
