package io.github.lucagiorgettismp.agenthud

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.lucagiorgettismp.agenthud.network.BridgeClient
import io.github.lucagiorgettismp.agenthud.ui.ConfigScreen

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
