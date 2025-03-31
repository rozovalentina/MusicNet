function setupDataChannel(peerConnection, onMessageCallback) {
    console.groupCollapsed('[WebRTC] Configurando Data Channel');
    
    try {
        // 1. Creación del Data Channel con configuración optimizada
        const dataChannel = peerConnection.createDataChannel('gameData', {
            ordered: true,          // Mensajes en orden
            maxPacketLifeTime: 3000, // 3 segundos de reintento
            maxRetransmits: 5,      // Máximo de reintentos
            protocol: 'game-protocol' // Protocolo personalizado
        });

        console.log('[WebRTC] Data Channel creado con configuración:', {
            id: dataChannel.id,
            label: dataChannel.label,
            readyState: dataChannel.readyState
        });

        // 2. Manejadores de eventos con logging
        dataChannel.onopen = () => {
            const stats = {
                bufferedAmount: dataChannel.bufferedAmount,
                bufferedAmountLowThreshold: dataChannel.bufferedAmountLowThreshold
            };
            console.log('[WebRTC] Data Channel abierto', stats);
            multiplayerState.connected = true;
            
            // Enviar mensaje de sincronización inicial
            if (multiplayerState.isHost) {
                const syncMsg = {
                    type: 'sync',
                    timestamp: Date.now(),
                    protocolVersion: '1.0'
                };
                sendData(dataChannel, syncMsg);
            }
        };

        dataChannel.onclose = () => {
            console.log('[WebRTC] Data Channel cerrado');
            multiplayerState.connected = false;
            
            // Intentar reconexión automática
            if (multiplayerState.retryCount < 3) {
                multiplayerState.retryCount++;
                console.log(`[WebRTC] Intentando reconexión (${multiplayerState.retryCount}/3)`);
                setTimeout(() => setupDataChannel(peerConnection, onMessageCallback), 2000);
            }
        };

        dataChannel.onerror = (error) => {
            console.error('[WebRTC] Error en Data Channel:', error);
            
            // Métricas de error
            const metrics = {
                bufferedAmount: dataChannel.bufferedAmount,
                bytesSent: dataChannel.bytesSent,
                messagesSent: dataChannel.messagesSent
            };
            console.error('[WebRTC] Métricas al fallar:', metrics);
        };

        dataChannel.onbufferedamountlow = () => {
            console.log('[WebRTC] Buffer bajo:', dataChannel.bufferedAmount);
        };

        dataChannel.onmessage = (event) => {
            console.log('[WebRTC] Mensaje recibido (tamaño:', event.data.length, 'bytes)');
            
            try {
                const message = JSON.parse(event.data);
                console.log('[WebRTC] Mensaje parseado:', 
                    message.type || 'unknown', 
                    'Size:', event.data.length, 'bytes');
                
                // Medición de latencia para mensajes con timestamp
                if (message.timestamp) {
                    const latency = Date.now() - message.timestamp;
                    console.log(`[WebRTC] Latencia: ${latency}ms`);
                }
                
                onMessageCallback(message);
            } catch (error) {
                console.error('[WebRTC] Error al procesar mensaje:', error, 'Raw:', event.data.substring(0, 100));
            }
        };

        // 3. Manejo de Data Channel remoto (para el cliente que no creó el channel)
        peerConnection.ondatachannel = (event) => {
            console.log('[WebRTC] Data Channel remoto recibido:', event.channel.label);
            const remoteChannel = event.channel;
            
            remoteChannel.onmessage = (event) => {
                console.log('[WebRTC] Mensaje desde canal remoto:');
                onMessageCallback(JSON.parse(event.data));
            };
        };

        console.groupEnd();
        return dataChannel;

    } catch (error) {
        console.error('[WebRTC] Error crítico al configurar Data Channel:', error);
        console.groupEnd();
        throw error; // Propaga el error para manejo externo
    }
}

function sendData(dataChannel, data) {
    // Validaciones iniciales
    if (!dataChannel) {
        console.error('[WebRTC] Intento de enviar datos sin Data Channel');
        return false;
    }

    if (dataChannel.readyState !== 'open') {
        console.warn(`[WebRTC] Data Channel no está listo (estado: ${dataChannel.readyState})`);
        return false;
    }

    // Prepara el mensaje con metadatos
    const message = {
        ...data,
        _metadata: {
            timestamp: Date.now(),
            sequence: multiplayerState.sequenceNumber++,
            protocol: '1.2'
        }
    };

    try {
        const messageString = JSON.stringify(message);
        
        // Verifica tamaño del mensaje (límite recomendado: 16KB)
        if (messageString.length > 16000) {
            console.error('[WebRTC] Mensaje demasiado grande:', messageString.length, 'bytes');
            return false;
        }

        // Verifica buffer antes de enviar
        if (dataChannel.bufferedAmount > 65536) { // 64KB
            console.warn('[WebRTC] Buffer lleno (', dataChannel.bufferedAmount, 'bytes). Mensaje en cola...');
        }

        console.log(`[WebRTC] Enviando mensaje (${messageString.length} bytes):`, 
            message.type || 'unknown', 
            'Seq:', message._metadata.sequence);

        // Envío real con manejo de errores
        dataChannel.send(messageString);
        
        // Métricas post-envío
        console.debug('[WebRTC] Métricas post-envío:', {
            bufferedAmount: dataChannel.bufferedAmount,
            bytesSent: dataChannel.bytesSent,
            messagesSent: dataChannel.messagesSent
        });

        return true;

    } catch (error) {
        console.error('[WebRTC] Error al enviar mensaje:', error, 'Data:', {
            type: data.type,
            size: JSON.stringify(data).length
        });
        
        // Estrategia de reintento para errores específicos
        if (error.name === 'NetworkError' && multiplayerState.retryCount < 3) {
            setTimeout(() => sendData(dataChannel, data), 500);
            multiplayerState.retryCount++;
            console.log(`[WebRTC] Reintentando envío (${multiplayerState.retryCount}/3)`);
        }
        
        return false;
    }
}