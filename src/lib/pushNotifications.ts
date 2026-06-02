import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

// Configuração do Firebase carregada via variáveis de ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Inicializa o Firebase apenas se as credenciais existirem e estiver no ambiente web
const initFirebaseWeb = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
    console.warn('Configurações do Firebase ausentes no arquivo .env. As notificações Web podem não funcionar.');
    return null;
  }
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
};

/**
 * Salva o token de notificação do usuário no Supabase
 */
export async function savePushToken(userId: string, token: string, deviceType: 'web' | 'android' | 'ios') {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { 
          user_id: userId, 
          token, 
          device_type: deviceType,
          created_at: new Date().toISOString()
        },
        { onConflict: 'token' }
      );

    if (error) throw error;
    console.log('Token de notificação push salvo com sucesso!');
    localStorage.setItem('fcm_token', token);
  } catch (error) {
    console.error('Erro ao salvar token de notificação push no Supabase:', error);
    throw error;
  }
}

/**
 * Remove o token de notificação do usuário do Supabase
 */
export async function removePushToken(token: string) {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('token', token);

    if (error) throw error;
    localStorage.removeItem('fcm_token');
    console.log('Token de notificação push removido com sucesso!');
  } catch (error) {
    console.error('Erro ao remover token de notificação push no Supabase:', error);
  }
}

/**
 * Registra notificações no dispositivo atual e solicita permissões
 */
export async function registerPushNotifications(userId: string): Promise<string> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    // -------------------------------------------------------------
    // FLUXO DO APLICATIVO NATIVO (Capacitor/Android APK)
    // -------------------------------------------------------------
    return new Promise((resolve, reject) => {
      // 1. Solicita permissão para receber notificações no Android/iOS
      PushNotifications.requestPermissions().then((permission) => {
        if (permission.receive === 'granted') {
          // 2. Registra o dispositivo no FCM
          PushNotifications.register();
        } else {
          reject(new Error('Permissão de notificação negada no dispositivo móvel.'));
        }
      });

      // 3. Listener disparado quando o registro no FCM é bem-sucedido
      PushNotifications.addListener('registration', async (token) => {
        const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
        try {
          await savePushToken(userId, token.value, platform);
          resolve(token.value);
        } catch (err) {
          reject(err);
        }
      });

      // 4. Listener disparado caso haja erro no registro nativo
      PushNotifications.addListener('registrationError', (error) => {
        reject(new Error(`Erro de registro nativo FCM: ${error.error}`));
      });
    });
  } else {
    // -------------------------------------------------------------
    // FLUXO DO NAVEGADOR WEB (PWA)
    // -------------------------------------------------------------
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Este navegador não suporta notificações push.');
    }

    const app = initFirebaseWeb();
    if (!app) {
      throw new Error('Configuração de credenciais Firebase ausente.');
    }

    const messaging = getMessaging(app);

    // Solicita permissão do navegador
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permissão de notificação negada pelo navegador.');
    }

    // Registra ou ativa o service worker padrão
    const registration = await navigator.serviceWorker.ready;

    // Obtém o token FCM Web
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY,
    });

    if (token) {
      await savePushToken(userId, token, 'web');
      return token;
    } else {
      throw new Error('Não foi possível recuperar o token de registro FCM Web.');
    }
  }
}

/**
 * Desativa notificações no dispositivo atual
 */
export async function unregisterPushNotifications() {
  const cachedToken = localStorage.getItem('fcm_token');
  if (cachedToken) {
    await removePushToken(cachedToken);
  }
}

/**
 * Obtém o status da permissão atual de notificação
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (Capacitor.isNativePlatform()) {
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'granted') return 'granted';
    if (permission.receive === 'denied') return 'denied';
    return 'default';
  } else {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}
