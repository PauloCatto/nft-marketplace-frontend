import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { io, type Socket } from 'socket.io-client';
import { JUNGLE_WS_URL } from '../mocks/socket/socketHandler';
import type { NftUpdatedEvent } from '../api/contracts';

export const Route = createFileRoute('/test-socket')({
  component: SocketTestPage,
});

function SocketTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR'>('CONNECTING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receivedEvent, setReceivedEvent] = useState<NftUpdatedEvent | null>(null);
  const [validationStatus, setValidationStatus] = useState<'PENDING' | 'VALID' | 'INVALID'>('PENDING');

  useEffect(() => {
    const socket: Socket = io(JUNGLE_WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: false,
    });

    socket.on('connect', () => {
      setConnectionStatus('CONNECTED');
      // Solicita ao servidor simulado a emissão do evento real nft.updated
      socket.emit('trigger-nft-update', {
        nftId: 'nft-1',
        version: 2,
        priceEth: '0.500',
        isAvailable: true,
        availableEditions: 6,
        updatedAt: '2026-11-01T20:00:00.000Z',
      });
    });

    socket.on('nft.updated', (event: NftUpdatedEvent) => {
      setReceivedEvent(event);

      // Validação estrita do payload e da versão do evento
      const isValid =
        event.nftId === 'nft-1' &&
        event.version === 2 &&
        event.priceEth === '0.500' &&
        event.isAvailable === true &&
        Boolean(event.updatedAt);

      setValidationStatus(isValid ? 'VALID' : 'INVALID');
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus('ERROR');
      setErrorMessage(err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto text-slate-100 font-mono">
      <h1 className="text-2xl font-bold text-emerald-400 mb-6">
        Prova Funcional Socket.IO no Navegador (MSW Service Worker)
      </h1>

      <div className="space-y-4 bg-slate-900/80 border border-slate-800 p-6 rounded-xl">
        <div className="flex justify-between items-center py-2 border-b border-slate-800">
          <span className="text-slate-400">Status da Conexão:</span>
          <span
            id="socket-connection-status"
            className={`font-bold ${
              connectionStatus === 'CONNECTED'
                ? 'text-emerald-400'
                : connectionStatus === 'ERROR'
                ? 'text-red-400'
                : 'text-amber-400'
            }`}
          >
            {connectionStatus}
          </span>
        </div>

        {errorMessage && (
          <div className="text-red-400 text-sm">
            Erro: <span id="socket-error-message">{errorMessage}</span>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-slate-800">
          <span className="text-slate-400">Evento nft.updated Recebido:</span>
          <span
            id="socket-event-received"
            className={`font-bold ${receivedEvent ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            {receivedEvent ? 'YES' : 'NO'}
          </span>
        </div>

        {receivedEvent && (
          <div className="space-y-2 py-2 border-b border-slate-800 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">nftId:</span>
              <span id="socket-event-nft-id" className="text-white">
                {receivedEvent.nftId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">version:</span>
              <span id="socket-event-version" className="text-white">
                {receivedEvent.version}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">priceEth:</span>
              <span id="socket-event-price" className="text-white">
                {receivedEvent.priceEth}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">isAvailable:</span>
              <span id="socket-event-available" className="text-white">
                {String(receivedEvent.isAvailable)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">updatedAt:</span>
              <span id="socket-event-updated-at" className="text-white">
                {receivedEvent.updatedAt}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <span className="text-slate-400">Validação do Payload e Versão:</span>
          <span
            id="socket-validation-status"
            className={`font-bold px-3 py-1 rounded text-xs ${
              validationStatus === 'VALID'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : validationStatus === 'INVALID'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {validationStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
