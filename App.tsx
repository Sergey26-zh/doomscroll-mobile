import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import RadarScreen from './src/screens/RadarScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import { useAuthStore } from './src/store/authStore';
import { useDetoxStore } from './src/store/detoxStore';
import { useUserStore } from './src/store/userStore';
import { COLORS } from './src/constants/colors';
import { useThemeStore } from './src/store/themeStore';

export default function App() {
  const { token, isLoading, initialize } = useAuthStore();
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register'>('login');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { activeTab, setActiveTab, sessionStatus, activeSessionId, pauseSession, resumeSession } = useDetoxStore();
  const { incomingRequests } = useUserStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!activeSessionId) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          await pauseSession();
        } catch (err) {
          console.error('Failed to auto-pause session:', err);
        }
      } else if (nextAppState === 'active') {
        try {
          await resumeSession();
        } catch (err) {
          console.error('Failed to auto-resume session:', err);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [activeSessionId, pauseSession, resumeSession]);

  const activeThemeColors = COLORS[theme];
  const isSessionRunning = sessionStatus === 'ACTIVE' || sessionStatus === 'PAUSED';
  const hasPendingRequests = incomingRequests.length > 0;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: activeThemeColors.background }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!token ? (
        currentScreen === 'login' ? (
          <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
        ) : (
          <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
        )
      ) : (
        <View style={[styles.appContainer, { backgroundColor: activeThemeColors.background }]}>
          <View style={{ flex: 1, display: activeTab === 'map' ? 'flex' : 'none' }}>
            <RadarScreen onOpenProfile={() => setIsProfileOpen(true)} />
          </View>
          <View style={{ flex: 1, display: activeTab === 'social' ? 'flex' : 'none' }}>
            <ProfileScreen forceTab="social" />
          </View>

          {isProfileOpen && (
            <View style={styles.profileOverlay}>
              <UserProfileScreen onClose={() => setIsProfileOpen(false)} />
            </View>
          )}

          {!isSessionRunning && !isProfileOpen && (
            <View
              style={[
                styles.tabBarContainer,
                {
                  backgroundColor: activeThemeColors.glass,
                  borderColor: activeThemeColors.border,
                  shadowColor: activeThemeColors.shadow,
                },
              ]}
            >
              <TouchableOpacity style={styles.tabButton} activeOpacity={0.7} onPress={() => setActiveTab('map')}>
                <Ionicons
                  name={activeTab === 'map' ? 'navigate' : 'navigate-outline'}
                  size={22}
                  color={activeTab === 'map' ? '#10b981' : '#94a3b8'}
                />
                <Text style={[styles.tabText, { color: activeTab === 'map' ? '#10b981' : '#94a3b8' }]}>
                  Карта
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.tabButton} activeOpacity={0.7} onPress={() => setActiveTab('social')}>
                <View style={styles.profileIconWrapper}>
                  <Ionicons
                    name={activeTab === 'social' ? 'people' : 'people-outline'}
                    size={22}
                    color={activeTab === 'social' ? '#10b981' : '#94a3b8'}
                  />
                  {hasPendingRequests && (
                    <View style={[styles.badgeDot, { backgroundColor: '#ef4444', borderColor: activeThemeColors.background }]} />
                  )}
                </View>
                <Text style={[styles.tabText, { color: activeTab === 'social' ? '#10b981' : '#94a3b8' }]}>
                  Встречи
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  profileOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000,
    elevation: 20,
    backgroundColor: '#F7F7F8',
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 24,
    right: 24,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    zIndex: 999,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  profileIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0b0f19',
  },
});
