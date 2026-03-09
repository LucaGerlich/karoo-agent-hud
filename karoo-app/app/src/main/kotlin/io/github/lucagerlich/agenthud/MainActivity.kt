package io.github.lucagerlich.agenthud

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.lucagerlich.agenthud.network.BridgeClient
import io.github.lucagerlich.agenthud.ui.ConfigScreen

class MainActivity : ComponentActivity() {
    private lateinit var bridgeClient: BridgeClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bridgeClient = BridgeClient(this)

        setContent {
            ConfigScreen(bridgeClient)
        }
    }
}
