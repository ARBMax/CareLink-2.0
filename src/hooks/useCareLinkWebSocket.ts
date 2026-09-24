/**
 * CareLink 2.0 — Real-Time WebSocket Hook
 * Connects to the backend WebSocket gateway and dispatches push events.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { adaptIncident, adaptDispatchArc, adaptTelemetryLog, adaptKPIStats } from '../services/api';

export interface WSHandlers {
  onNewIncident?: (incident: any) => void;
  onUpdateIncident?: (incident: any) => void;
  onNewLog?: (log: any) => void;
  onNewDispatch?: (arc: any) => void;
  onDispatchProgress?: (data: any) => void;
  onVolunteerStatus?: (data: any) => void;
  onStatsUpdate?: (stats: any) => void;
  onPipelineStatus?: (status: any) => void;
}

export function useCareLinkWebSocket(handlers: WSHandlers) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    // In dev, use proxy ws:// or direct ws://localhost:8000/ws
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('⚡ Connected to CareLink Real-Time Gateway');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.event || data.type;
          const payload = data.payload || data.data;

          switch (type) {
            case 'NEW_INCIDENT':
              if (handlersRef.current.onNewIncident && payload) {
                handlersRef.current.onNewIncident(adaptIncident(payload));
              }
              break;

            case 'UPDATE_INCIDENT':
              if (handlersRef.current.onUpdateIncident && payload) {
                handlersRef.current.onUpdateIncident(adaptIncident(payload));
              }
              break;

            case 'NEW_LOG':
              if (handlersRef.current.onNewLog && payload) {
                handlersRef.current.onNewLog(adaptTelemetryLog(payload));
              }
              break;

            case 'DISPATCH_NEW':
              if (handlersRef.current.onNewDispatch && payload) {
                handlersRef.current.onNewDispatch(adaptDispatchArc(payload));
              }
              break;

            case 'DISPATCH_PROGRESS':
              if (handlersRef.current.onDispatchProgress && payload) {
                handlersRef.current.onDispatchProgress(payload);
              }
              break;

            case 'VOLUNTEER_STATUS':
              if (handlersRef.current.onVolunteerStatus && payload) {
                handlersRef.current.onVolunteerStatus(payload);
              }
              break;

            case 'STATS_UPDATE':
              if (handlersRef.current.onStatsUpdate && payload) {
                handlersRef.current.onStatsUpdate(adaptKPIStats(payload));
              }
              break;

            case 'PIPELINE_STATUS':
              if (handlersRef.current.onPipelineStatus && payload) {
                handlersRef.current.onPipelineStatus(payload);
              }
              break;

            default:
              break;
          }
        } catch (err) {
          console.warn('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect in 3s
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket connection attempt failed:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, []);

  useEffect(() => {
    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ action: 'PING' }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((action: string, payload?: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, ...payload }));
    }
  }, []);

  return { isConnected, send };
}
