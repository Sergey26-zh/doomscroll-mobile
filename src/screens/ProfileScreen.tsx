import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
  Clipboard,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useUserStore } from '../store/userStore';
import { useDetoxStore } from '../store/detoxStore';
import { useAuthStore } from '../store/authStore';
import { useLocationStore } from '../store/locationStore';
import { COLORS } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';
import { getRealVisibleBssids } from '../utils/wifi';

// Maps backend plant status enum to outline icons and colors
function getPersonalPlantDetails(status: string = 'SEED') {
  switch (status) {
    case 'SEED':
      return { label: 'Семечко', icon: 'leaf-outline', color: '#10b981', size: 44, desc: 'Первый шаг на пути к осознанности. Поливайте его своим оффлайн-временем!' };
    case 'SPROUT':
      return { label: 'Росток', icon: 'leaf-outline', color: '#10b981', size: 60, desc: 'Ваша дисциплина дает плоды. Растение пробилось сквозь цифровой шум!' };
    case 'YOUNG_BONSAI':
      return { label: 'Молодой бонсай', icon: 'leaf', color: '#059669', size: 70, desc: 'Красивый и хрупкий. Требует регулярного детокса для укрепления.' };
    case 'TREE_OF_TRUST':
      return { label: 'Дерево доверия', icon: 'tree-outline', color: '#10b981', size: 85, desc: 'Крепкий ствол и пышная крона. Друзья знают, что вы цените реальное общение!' };
    case 'OFFLINE_ASCETIC':
      return { label: 'Оффлайн-Аскет', icon: 'trophy-outline', color: '#f59e0b', size: 80, desc: 'Легендарное дерево цифровой свободы. Вы полностью контролируете свою жизнь!' };
    default:
      return { label: 'Семечко', icon: 'leaf-outline', color: '#10b981', size: 44, desc: 'Начало пути' };
  }
}

function getSharedPlantDetails(status: string = 'SMALL_SPROUT') {
  switch (status) {
    case 'SMALL_SPROUT':
      return { label: 'Маленький росток', icon: 'leaf-outline', color: '#10b981', size: 44, desc: 'Ваша банда только посадила семечко. Время собираться чаще!' };
    case 'GREEN_HOUSE_ALPHA':
      return { label: 'Парник Альфа', icon: 'leaf-outline', color: '#10b981', size: 60, desc: 'Начало экосистемы. Вы качаетесь как единая команда!' };
    case 'CYBER_GARDEN':
      return { label: 'Кибер-сад', icon: 'leaf', color: '#059669', size: 70, desc: 'Футуристичное пространство. Множители опыта дают сочные плоды!' };
    case 'MEGA_TREE_CLAN':
      return { label: 'Мега-дерево клана', icon: 'tree-outline', color: '#10b981', size: 85, desc: 'Огромное величественное дерево. Ваша банда доказывает силу офлайна.' };
    case 'TITAN_OASIS':
      return { label: 'Оазис титанов', icon: 'trophy-outline', color: '#f59e0b', size: 80, desc: 'Абсолютная гармония. Открыт доступ на закрытые тусовки и эксклюзивные ивенты!' };
    default:
      return { label: 'Маленький росток', icon: 'leaf-outline', color: '#10b981', size: 44, desc: 'Начало лобби' };
  }
}

// Avatar customization details using outline icons
const CLOTHING_OPTIONS = [
  { id: 'casual', label: 'Футболка', icon: 'shirt-outline' },
  { id: 'suit', label: 'Пиджак', icon: 'briefcase-outline' },
  { id: 'hoodie', label: 'Худи', icon: 'shirt-outline' },
];

const HAT_OPTIONS = [
  { id: 'none', label: 'Без убора', icon: 'close-circle-outline' },
  { id: 'cap', label: 'Козырек', icon: 'ribbon-outline' },
  { id: 'crown', label: 'Корона', icon: 'trophy-outline' },
  { id: 'headphones', label: 'Наушники', icon: 'headset-outline' },
];

const GLASSES_OPTIONS = [
  { id: 'none', label: 'Без очков', icon: 'close-circle-outline' },
  { id: 'sunglasses', label: 'Солнечные', icon: 'glasses-outline' },
  { id: 'monocle', label: 'Монокль', icon: 'eye-outline' },
];

export default function ProfileScreen({ forceTab }: { forceTab?: 'social' | 'profile' }) {
  const { logout } = useAuthStore();
  const {
    profile,
    friends,
    incomingRequests,
    rewards,
    activity,
    isLoadingProfile,
    isLoadingFriends,
    isLoadingRewards,
    loadProfile,
    toggleWalkReady,
    loadFriends,
    sendRequest,
    acceptRequest,
    removeFriendship,
    loadRewards,
  } = useUserStore();

  const {
    activeSessionId,
    sessionStatus,
    locationName,
    durationSeconds,
    earnedPoints,
    message: sessionMessage,
    activeLobby,
    isLoading: isSessionLoading,
    pauseSession,
    resumeSession,
    stopSession,
    createNewLobby,
    joinExistingLobby,
    refreshLobbyStatus,
    loadActiveLobby,
    leaveLobby,
    resetSessionState,
    startSession,
  } = useDetoxStore();

  const { selectedLocation, locations, friendsLocations } = useLocationStore();

  const [activeSubTab, setActiveSubTab] = useState<'room' | 'lobby' | 'friends' | 'rewards'>('room');
  const [friendInput, setFriendInput] = useState('');
  const [lobbyCodeInput, setLobbyCodeInput] = useState('');
  const [accumulateToShared, setAccumulateToShared] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Avatar customizer states
  const [wardrobeVisible, setWardrobeVisible] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState('casual');
  const [selectedHat, setSelectedHat] = useState('none');
  const [selectedGlasses, setSelectedGlasses] = useState('none');

  // Garden state
  const [gardenTab, setGardenTab] = useState<'personal' | 'communal'>('personal');

  // GPS for distance verification
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Countdown timer state
  const [countdown, setCountdown] = useState<number | null>(null);

  const { theme: themeMode, toggleTheme } = useThemeStore();
  const activeColors = themeMode === 'light' ? COLORS.light : COLORS.dark;
  const styles = useMemo(() => getStyles(activeColors), [themeMode]);

  // Fetch current user location in background
  useEffect(() => {
    let active = true;
    const getPos = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        setUserCoords({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
      } catch (err) {
        console.warn('Error fetching location in ProfileScreen:', err);
      }
    };

    getPos();
    const interval = setInterval(getPos, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы действительно хотите выйти из своего аккаунта?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadProfile();
    loadFriends();
    loadRewards();
    loadActiveLobby();
  }, []);

  // Listen to sessionStatus transitions (completed/failed)
  useEffect(() => {
    if (sessionStatus === 'COMPLETED') {
      Alert.alert(
        'Сессия завершена! 🎉',
        sessionMessage || 'Отличная работа! Награда добавлена в ваш Оазис.',
        [{ text: 'Отлично', onPress: () => {
          resetSessionState();
          loadRewards(); // Refresh rewards list
        } }]
      );
    } else if (sessionStatus === 'FAILED') {
      Alert.alert(
        'Сессия сорвана 😢',
        sessionMessage || 'Сессия была прервана из-за использования телефона.',
        [{ text: 'Понятно', onPress: () => resetSessionState() }]
      );
    }
  }, [sessionStatus, sessionMessage]);

  // Poll lobby status periodically if active
  useEffect(() => {
    let interval: any = null;
    if (activeLobby) {
      interval = setInterval(() => {
        refreshLobbyStatus();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeLobby]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadProfile(), loadFriends(), loadRewards(), loadActiveLobby()]);
    if (activeLobby) {
      await refreshLobbyStatus();
    }
    setIsRefreshing(false);
  };

  const handleSendRequest = async () => {
    if (!friendInput.trim()) return;
    try {
      const msg = await sendRequest(friendInput.trim());
      Alert.alert('Успешно', msg);
      setFriendInput('');
      loadFriends();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleCreateLobby = async () => {
    try {
      await createNewLobby(accumulateToShared);
      Alert.alert('Лобби создано', `Код встречи сгенерирован! Поделитесь им с друзьями.`);
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось создать лобби');
    }
  };

  const handleJoinLobby = async () => {
    if (!lobbyCodeInput.trim()) return;
    try {
      await joinExistingLobby(lobbyCodeInput.trim().toUpperCase());
      Alert.alert('Успешно', 'Вы присоединились к лобби встречи!');
      setLobbyCodeInput('');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const handleLeaveLobby = () => {
    Alert.alert(
      'Выход из лобби',
      'Вы уверены, что хотите выйти из лобби встречи? Прогресс совместного парника сохранится, но вы больше не будете получать мультиплеерный бонус в этой сессии.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveLobby();
              Alert.alert('Успешно', 'Вы покинули лобби встречи');
            } catch (e: any) {
              Alert.alert('Ошибка', e.message || 'Не удалось выйти из лобби');
            }
          }
        }
      ]
    );
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Скопировано', 'Код скопирован в буфер обмена');
  };

  // Format timer
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Distance calculator helper
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Selected target location for current lobby meetups
  const targetLoc = useMemo(() => {
    return selectedLocation || (locations.length > 0 ? locations[0] : null);
  }, [selectedLocation, locations]);

  // Determine user/friend distance status relative to target location
  const getMemberStatus = (username: string) => {
    if (!targetLoc) {
      return { status: 'В пути', distanceStr: 'Локация не выбрана', color: '#f59e0b' };
    }

    let coords: { latitude: number; longitude: number } | null = null;
    if (username === profile?.username) {
      coords = userCoords;
    } else {
      const fLoc = friendsLocations.find(l => l.username === username);
      if (fLoc && fLoc.latitude !== 0 && fLoc.longitude !== 0) {
        coords = fLoc;
      }
    }

    if (!coords) {
      return { status: 'В пути', distanceStr: 'определяем гео...', color: '#f59e0b' };
    }

    const dist = getDistanceMeters(coords.latitude, coords.longitude, targetLoc.latitude, targetLoc.longitude);
    if (dist <= 150) {
      return { status: 'На месте / Готов', distanceStr: 'Уже за столиком ☕', color: '#10b981' };
    } else {
      const distStr = dist < 1000 ? `${Math.round(dist)} м` : `${(dist / 1000).toFixed(1)} км`;
      return { status: 'В пути', distanceStr: `осталось ${distStr}`, color: '#f59e0b' };
    }
  };

  // Check if all active lobby members are ready on spot
  const allMembersReady = useMemo(() => {
    if (!activeLobby || activeLobby.membersUsernames.length === 0) return false;
    return activeLobby.membersUsernames.every(u => {
      const info = getMemberStatus(u);
      return info.status === 'На месте / Готов';
    });
  }, [activeLobby, userCoords, friendsLocations, targetLoc, profile, friends]);

  // Handle countdown triggers
  const handleLaunchSession = () => {
    if (!targetLoc) {
      Alert.alert('Локация не выбрана 📍', 'Сначала выберите локацию на карте в Радаре.');
      return;
    }

    const myStatus = getMemberStatus(profile?.username || '');
    if (myStatus.status !== 'На месте / Готов') {
      Alert.alert('Ожидание банды ⏳', 'Вы должны находиться на месте встречи (быть в радиусе 150м от локации).');
      return;
    }

    if (!allMembersReady) {
      Alert.alert('Ожидание участников ⏳', 'Не все участники лобби прибыли на место встречи!');
      return;
    }

    setCountdown(3);
  };

  // Countdown timer logic
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      const triggerStart = async () => {
        try {
          const lat = userCoords?.latitude || targetLoc?.latitude || 0;
          const lon = userCoords?.longitude || targetLoc?.longitude || 0;
          const fallbacks = targetLoc?.bssidList && targetLoc.bssidList.length > 0
            ? targetLoc.bssidList
            : ['00:11:22:33:44:55'];
          const bssids = await getRealVisibleBssids(fallbacks);
          await startSession(targetLoc?.id || '00000000-0000-0000-0000-000000000000', lat, lon, targetLoc?.name || 'Встреча', bssids);
        } catch (e: any) {
          Alert.alert('Ошибка старта', e.message || 'Не удалось запустить сессию');
        }
      };
      triggerStart();
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Generate GitHub habits heatmap using real backend activity stats
  const heatmapData = useMemo(() => {
    const data = [];
    const backendActivity = activity || [];
    if (backendActivity.length > 0) {
      for (let i = 0; i < backendActivity.length; i++) {
        const item = backendActivity[i];
        const xp = item.points;
        let level = 0;
        if (xp > 400) level = 4;
        else if (xp > 260) level = 3;
        else if (xp > 130) level = 2;
        else if (xp > 40) level = 1;
        data.push({ index: i, xp, level, date: item.date });
      }
    } else {
      // Fallback/empty state while loading
      for (let i = 0; i < 105; i++) {
        data.push({ index: i, xp: 0, level: 0 });
      }
    }
    return data;
  }, [activity]);

  // Sync personal XP/Rating with profile socialRating (eliminates contradiction)
  const userXP = profile?.socialRating || 0;
  const personalPlant = getPersonalPlantDetails(profile?.personalPlantStatus);
  const sharedPlant = activeLobby ? getSharedPlantDetails(activeLobby.sharedPlantStatus) : null;
  const isSessionRunning = sessionStatus === 'ACTIVE' || sessionStatus === 'PAUSED';

  // Synchronize rewards policies calculations
  const elapsedMinutes = durationSeconds / 60;

  const activeLocation = useMemo(() => {
    if (!locationName) return null;
    return locations.find(l => l.name === locationName) || null;
  }, [locationName, locations]);

  const policies = useMemo(() => {
    if (activeLocation && activeLocation.rewardPolicies && activeLocation.rewardPolicies.length > 0) {
      return activeLocation.rewardPolicies;
    }
    // Fallback/Default policies representing tree growth
    return [
      { requiredMinutes: 10, rewardText: 'Росток 🌲' },
      { requiredMinutes: 25, rewardText: 'Молодое дерево 🌳' },
      { requiredMinutes: 45, rewardText: 'Цветущий Оазис 🌺' },
    ];
  }, [activeLocation]);

  const maxRequiredMinutes = useMemo(() => {
    if (policies.length === 0) return 45;
    return Math.max(...policies.map(p => p.requiredMinutes));
  }, [policies]);

  const progressPercent = Math.min(100, (elapsedMinutes / maxRequiredMinutes) * 100);

  // Rendering correct SubTab / ForceTab screens
  const showSocialTab = forceTab === 'social';
  const showProfileTab = forceTab === 'profile';

  // 1. ACTIVE SESSION PITCH-BLACK SCREEN WITH GLOW
  if (isSessionRunning && showSocialTab) {
    return (
      <SafeAreaView style={styles.blackSessionContainer} edges={['top', 'left', 'right', 'bottom']}>
        {/* Glow halo overlay */}
        <View style={[
          styles.glowHalo, 
          { borderColor: sessionStatus === 'PAUSED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)' }
        ]} />

        <ScrollView 
          style={{ width: '100%', flex: 1 }}
          contentContainerStyle={[styles.blackSessionContent, { paddingVertical: 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.blackSessionHeader, { color: sessionStatus === 'PAUSED' ? '#ef4444' : '#10b981', marginTop: Platform.OS === 'ios' ? 0 : 20 }]}>
            ЭКРАНЫ НА СТОЛ
          </Text>
          <Text style={styles.blackSessionSubtitle}>
            {sessionStatus === 'ACTIVE' 
              ? `Идет командная сессия в "${locationName || 'выбранной локации'}"`
              : 'Вы заблокировали/разблокировали экран или свернули приложение. Немедленно вернитесь!'
            }
          </Text>

          {/* Large circular glowing progress timer */}
          <View style={[
            styles.circularTimerWrapper, 
            { borderColor: sessionStatus === 'PAUSED' ? '#ef4444' : '#10b981', shadowColor: sessionStatus === 'PAUSED' ? '#ef4444' : '#10b981' }
          ]}>
            <Text style={styles.circularTimerText}>{formatTimer(durationSeconds)}</Text>
            {activeLobby && (
              <Text style={styles.circularMultiplier}>x{activeLobby.membersCount} ОПЫТ</Text>
            )}
          </View>

          {sessionStatus === 'PAUSED' && (
            <View style={styles.flashWarningBox}>
              <Ionicons name="alert-circle-outline" size={24} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={styles.flashWarningText}>Осталось менее 2 минут до срыва сессии!</Text>
            </View>
          )}

          {/* Members active check in row */}
          {activeLobby && (
            <View style={styles.sessionActiveMembersContainer}>
              <Text style={styles.sessionActiveLabel}>ВАША КОМАНДА</Text>
              <View style={styles.sessionAvatarsRow}>
                {activeLobby.membersUsernames.map((u, i) => {
                  const isUser = u === profile?.username;
                  const borderCol = sessionStatus === 'PAUSED' && isUser ? '#ef4444' : '#10b981';
                  return (
                     <View key={i} style={styles.activeUserAvatarBox}>
                      <View style={[styles.activeUserAvatarCircle, { borderColor: borderCol }]}>
                        <Text style={styles.activeUserAvatarText}>{u.substring(0, 2).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.activeUserAvatarName} numberOfLines={1}>{u}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Progress Bar & Rewards */}
          <View style={styles.rewardsProgressContainer}>
            <Text style={styles.rewardsProgressTitle}>НАГРАДЫ И ДОСТИЖЕНИЯ</Text>
            
            {/* The Horizontal Track */}
            <View style={styles.progressTrackWrapper}>
              <View style={styles.progressTrackBase}>
                <View style={[styles.progressTrackFill, { width: `${progressPercent}%` }]} />
              </View>
              
              {/* Milestone Dots along the track */}
              {policies.map((policy, idx) => {
                const positionPercent = (policy.requiredMinutes / maxRequiredMinutes) * 100;
                const isReached = elapsedMinutes >= policy.requiredMinutes;
                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.milestoneDot, 
                      { 
                        left: `${positionPercent}%`, 
                        backgroundColor: isReached ? '#10b981' : '#1e293b',
                        borderColor: isReached ? '#ffffff' : '#475569',
                      }
                    ]}
                  >
                    <Ionicons 
                      name={isReached ? "gift" : "gift-outline"} 
                      size={10} 
                      color={isReached ? "#ffffff" : "#94a3b8"} 
                    />
                  </View>
                );
              })}
            </View>

            {/* List of Milestones with Icons & Status */}
            <View style={styles.milestonesList}>
              {policies.map((policy, idx) => {
                const isReached = elapsedMinutes >= policy.requiredMinutes;
                const remainingSecs = Math.max(0, policy.requiredMinutes * 60 - durationSeconds);
                const remainingMins = Math.ceil(remainingSecs / 60);

                return (
                  <View 
                    key={idx} 
                    style={[
                      styles.milestoneItemRow,
                      isReached && styles.milestoneItemRowActive
                    ]}
                  >
                    <View style={[
                      styles.milestoneStatusIconBg,
                      { backgroundColor: isReached ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)' }
                    ]}>
                      <Ionicons 
                        name={isReached ? "checkmark" : "lock-closed-outline"} 
                        size={14} 
                        color={isReached ? "#10b981" : "#94a3b8"} 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.milestoneRewardName,
                        { color: isReached ? '#ffffff' : '#94a3b8' }
                      ]}>
                        {policy.rewardText}
                      </Text>
                      <Text style={styles.milestoneMinutesLabel}>
                        {policy.requiredMinutes} мин
                      </Text>
                    </View>
                    {!isReached && (
                      <Text style={styles.milestoneRemainingText}>
                        осталось {remainingMins} мин
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Fail/Cancel Button */}
          <TouchableOpacity style={styles.giveUpBtn} onPress={stopSession} disabled={isSessionLoading}>
            <Ionicons name="close-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.giveUpBtnText}>Сдаться</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.background }} edges={['top', 'left', 'right']}>
      {/* ── COUNTDOWN OVERLAY ── */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownTitle}>ВСТРЕЧА СТАРТУЕТ ЧЕРЕЗ</Text>
          <Text style={styles.countdownNumber}>{countdown === 0 ? 'СТАРТ!' : countdown}</Text>
          <Text style={styles.countdownSubtitle}>ЭКРАНЫ НА СТОЛ!</Text>
        </View>
      )}

      {/* ── WARDROBE MODAL ── */}
      <Modal visible={wardrobeVisible} transparent animationType="slide" onRequestClose={() => setWardrobeVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setWardrobeVisible(false)}>
          <Pressable style={[styles.modalPanel, { backgroundColor: activeColors.card, borderColor: activeColors.border }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: activeColors.text }]}>Мой Гардероб</Text>
              <TouchableOpacity onPress={() => setWardrobeVisible(false)}>
                <Ionicons name="close-outline" size={24} color={activeColors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: activeColors.border }]} />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              {/* Category 1: Clothes */}
              <View>
                <Text style={[styles.wardrobeCategoryTitle, { color: activeColors.textMuted }]}>ОДЕЖДА</Text>
                <View style={styles.wardrobeRow}>
                  {CLOTHING_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.wardrobeChip, selectedOutfit === opt.id && styles.wardrobeChipActive, { borderColor: activeColors.border }]}
                      onPress={() => setSelectedOutfit(opt.id)}
                    >
                      <Ionicons name={opt.icon as any} size={20} color={selectedOutfit === opt.id ? '#3b82f6' : activeColors.text} />
                      <Text style={[styles.wardrobeChipText, { color: activeColors.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category 2: Hats */}
              <View>
                <Text style={[styles.wardrobeCategoryTitle, { color: activeColors.textMuted }]}>ГОЛОВНЫЕ УБОРЫ</Text>
                <View style={styles.wardrobeRow}>
                  {HAT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.wardrobeChip, selectedHat === opt.id && styles.wardrobeChipActive, { borderColor: activeColors.border }]}
                      onPress={() => setSelectedHat(opt.id)}
                    >
                      <Ionicons name={opt.icon as any} size={20} color={selectedHat === opt.id ? '#3b82f6' : activeColors.text} />
                      <Text style={[styles.wardrobeChipText, { color: activeColors.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category 3: Glasses */}
              <View>
                <Text style={[styles.wardrobeCategoryTitle, { color: activeColors.textMuted }]}>ОЧКИ</Text>
                <View style={styles.wardrobeRow}>
                  {GLASSES_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.wardrobeChip, selectedGlasses === opt.id && styles.wardrobeChipActive, { borderColor: activeColors.border }]}
                      onPress={() => setSelectedGlasses(opt.id)}
                    >
                      <Ionicons name={opt.icon as any} size={20} color={selectedGlasses === opt.id ? '#3b82f6' : activeColors.text} />
                      <Text style={[styles.wardrobeChipText, { color: activeColors.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.modalApplyBtn} onPress={() => setWardrobeVisible(false)}>
              <Text style={styles.modalApplyBtnText}>Применить образ</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header Profile Info section */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{profile?.username?.substring(0, 2).toUpperCase() || 'US'}</Text>
            <View style={[styles.statusIndicator, { 
              backgroundColor: profile?.readyToAirOut ? '#10b981' : '#64748b',
              borderColor: activeColors.background
            }]} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{profile?.username || 'Загрузка...'}</Text>
            <Text style={styles.email}>{profile?.email || 'email@example.com'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} onPress={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color={activeColors.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionBtn} onPress={toggleTheme}>
              <Ionicons name={themeMode === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={activeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerActionBtn, styles.logoutBtn]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── TAB 2: СОЦИАЛЬНЫЙ ХАБ (LOBBY & MATCHMAKING) ── */}
        {showSocialTab && (
          <View style={{ flex: 1 }}>
            {!activeLobby ? (
              <View style={styles.lobbySetupBox}>
                <Text style={styles.lobbyTitle}>Совместный Парник</Text>
                <Text style={styles.lobbyDescription}>
                  Создайте лобби и позовите друзей. Время оффлайна будет складываться и умножаться на количество участников!
                </Text>

                {/* Join lobby card */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputCardLabel}>Войти по коду встречи</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.lobbyInput}
                      placeholder="DX-482"
                      placeholderTextColor="#64748b"
                      value={lobbyCodeInput}
                      onChangeText={setLobbyCodeInput}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.inputBtn} onPress={handleJoinLobby}>
                      <Text style={styles.inputBtnText}>Войти</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Create lobby card */}
                <View style={styles.inputCard}>
                  <Text style={styles.inputCardLabel}>Создать новое лобби</Text>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.switchLabel}>Копить на Общую Клумбу</Text>
                      <Text style={styles.switchSubtitle}>
                        {accumulateToShared 
                          ? 'Опыт качает общее дерево-гигант со множителем' 
                          : 'Время падает в личные горшки без бонуса'}
                      </Text>
                    </View>
                    <Switch
                      value={accumulateToShared}
                      onValueChange={setAccumulateToShared}
                      trackColor={{ false: '#334155', true: 'rgba(16, 185, 129, 0.4)' }}
                      thumbColor={accumulateToShared ? '#10b981' : '#94a3b8'}
                    />
                  </View>
                  <TouchableOpacity style={styles.createLobbyBtn} onPress={handleCreateLobby}>
                    <Text style={styles.createLobbyBtnText}>Создать Лобби встречи</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.lobbyActiveBox}>
                {/* Lobby Details Banner */}
                <View style={styles.lobbyCodeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lobbyCodeLabel}>КОД ВАШЕЙ ВСТРЕЧИ</Text>
                    <TouchableOpacity style={styles.codeBadgeRow} onPress={() => copyToClipboard(activeLobby.code)}>
                      <Text style={styles.lobbyCodeText}>{activeLobby.code}</Text>
                      <Ionicons name="copy-outline" size={16} color="#10b981" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                    {targetLoc && (
                      <Text style={[styles.targetLocationLabel, { color: activeColors.textMuted }]}>
                        Место: <Text style={{ color: '#10b981', fontWeight: '800' }}>{targetLoc.name}</Text>
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.leaveLobbyBtn} onPress={handleLeaveLobby}>
                    <Text style={styles.leaveLobbyText}>Выйти</Text>
                  </TouchableOpacity>
                </View>

                {/* Shared plant progress */}
                <View style={styles.plantContainer}>
                  <View style={styles.sharedPlantHalo}>
                    <Ionicons name={(sharedPlant?.icon || 'leaf-outline') as any} size={sharedPlant?.size || 54} color={sharedPlant?.color || '#10b981'} />
                  </View>
                  <Text style={styles.plantStatusLabel}>Совместный Парник Банды</Text>
                  <Text style={styles.plantStatusName}>{sharedPlant?.label}</Text>
                  <Text style={styles.plantDescription}>{sharedPlant?.desc}</Text>

                  <View style={styles.xpProgressContainer}>
                    <View style={styles.xpRow}>
                      <Text style={styles.xpText}>Общий опыт Сада</Text>
                      <Text style={styles.xpVal}>{activeLobby.sharedPlantXp} XP</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { backgroundColor: '#10b981', width: `${Math.min(100, (activeLobby.sharedPlantXp / 4000) * 100)}%` }]} />
                    </View>
                    <Text style={styles.levelProgressInfo}>
                      Прогресс до Мега-дерева клана (4000 XP)
                    </Text>
                  </View>
                </View>
                {/* Launch session action button (relocated inside scroll layout) */}
                <TouchableOpacity 
                  disabled={!allMembersReady}
                  style={[
                    styles.launchSessionBtn, 
                    { 
                      backgroundColor: allMembersReady ? '#10b981' : (themeMode === 'light' ? '#e2e8f0' : '#1e293b'), 
                      shadowColor: allMembersReady ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
                      opacity: allMembersReady ? 1 : 0.7,
                      marginTop: 16,
                      marginBottom: 16,
                    }
                  ]} 
                  onPress={handleLaunchSession}
                >
                  <Ionicons name="play-outline" size={20} color={allMembersReady ? 'white' : (themeMode === 'light' ? '#94a3b8' : '#475569')} style={{ marginRight: 8 }} />
                  <Text style={[styles.launchSessionBtnText, { color: allMembersReady ? 'white' : (themeMode === 'light' ? '#94a3b8' : '#475569') }]}>ЭКРАНЫ НА СТОЛ</Text>
                </TouchableOpacity>

                {/* Slots Grid */}
                <View style={styles.lobbySlotsGridContainer}>
                  <View style={styles.lobbySlotsHeader}>
                    <Ionicons name="people-outline" size={18} color="#10b981" />
                    <Text style={styles.lobbySlotsTitle}>Участники встречи</Text>
                  </View>

                  <View style={styles.slotsVerticalStack}>
                    {activeLobby.membersUsernames.map((username, index) => {
                      const mStatus = getMemberStatus(username);
                      const isSelf = username === profile?.username;

                      return (
                        <View 
                          key={username} 
                          style={[
                            styles.slotItem, 
                            { 
                              borderColor: mStatus.color,
                              backgroundColor: mStatus.status === 'На месте / Готов' 
                                ? 'rgba(16, 185, 129, 0.04)' 
                                : 'rgba(245, 158, 11, 0.04)'
                            }
                          ]}
                        >
                          {/* Avatar */}
                          <View style={[styles.slotAvatarCircle, { backgroundColor: isSelf ? '#3b82f6' : '#7c3aed' }]}>
                            <Text style={styles.slotAvatarText}>{username.substring(0, 2).toUpperCase()}</Text>
                          </View>

                          {/* Info */}
                          <View style={styles.slotInfoContainer}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={[styles.slotName, { color: activeColors.text }]}>{username}</Text>
                              {isSelf && <Text style={styles.youBadge}>вы</Text>}
                            </View>
                            <Text style={[styles.slotDistance, { color: activeColors.textMuted }]}>{mStatus.distanceStr}</Text>
                          </View>

                          {/* Status Badge */}
                          <View style={[styles.slotStatusBadge, { backgroundColor: mStatus.color }]}>
                            <Text style={styles.slotStatusText}>{mStatus.status.toUpperCase()}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Bottom spacer for layout-safe scrolling above Tab Bar */}
                <View style={{ height: 100 }} />
              </View>
            )}
          </View>
        )}

        {/* ── TAB 3: МОЙ ОАЗИС SCREEN ── */}
        {showProfileTab && (
          <View style={{ flex: 1 }}>
            
            {/* Avatar customization card */}
            <View style={styles.profileAvatarCard}>
              <View style={styles.characterContainer}>
                <View style={styles.characterInnerHalo}>
                  {/* Minimalist Outline Icon base avatar */}
                  <Ionicons name="person-outline" size={60} color="#10b981" />
                  
                  {/* Accessory Hat layer overlay */}
                  {selectedHat !== 'none' && (
                    <Ionicons 
                      name={
                        selectedHat === 'cap' ? 'ribbon-outline' :
                        selectedHat === 'crown' ? 'trophy-outline' : 'headset-outline'
                      }
                      size={26}
                      color="#f59e0b"
                      style={{ position: 'absolute', top: -10 }}
                    />
                  )}

                  {/* Accessory Glasses layer overlay */}
                  {selectedGlasses !== 'none' && (
                    <Ionicons 
                      name={selectedGlasses === 'sunglasses' ? 'glasses-outline' : 'eye-outline'}
                      size={24}
                      color="#3b82f6"
                      style={{ position: 'absolute', top: 22 }}
                    />
                  )}

                  {/* Accessory Outfit layer overlay */}
                  {selectedOutfit !== 'casual' && (
                    <Ionicons 
                      name={selectedOutfit === 'suit' ? 'briefcase-outline' : 'shirt-outline'}
                      size={20}
                      color="#7c3aed"
                      style={{ position: 'absolute', bottom: -5 }}
                    />
                  )}
                </View>
              </View>

              <Text style={[styles.avatarCardTitle, { color: activeColors.text }]}>{profile?.username || 'Исследователь'}</Text>
              <Text style={[styles.avatarCardRating, { color: '#10b981' }]}>{userXP} XP</Text>
              
              <TouchableOpacity style={styles.wardrobeBtn} onPress={() => setWardrobeVisible(true)}>
                <Ionicons name="shirt-outline" size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.wardrobeBtnText}>Гардероб</Text>
              </TouchableOpacity>
            </View>

            {/* Focus tree garden with sub-tabs */}
            <View style={styles.gardenCard}>
              <View style={styles.gardenHeader}>
                <Text style={[styles.gardenTitle, { color: activeColors.text }]}>Оазисный сад</Text>
                <View style={styles.gardenSubTabs}>
                  <TouchableOpacity 
                    style={[styles.gardenSubTab, gardenTab === 'personal' && styles.gardenSubTabActive]} 
                    onPress={() => setGardenTab('personal')}
                  >
                    <Text style={[styles.gardenSubTabText, gardenTab === 'personal' && styles.gardenSubTabTextActive, { color: activeColors.text }]}>Личный</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gardenSubTab, gardenTab === 'communal' && styles.gardenSubTabActive]} 
                    onPress={() => setGardenTab('communal')}
                  >
                    <Text style={[styles.gardenSubTabText, gardenTab === 'communal' && styles.gardenSubTabTextActive, { color: activeColors.text }]}>Банды</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {gardenTab === 'personal' ? (
                <View style={styles.gardenVisualContent}>
                  <View style={styles.plantVisualWrapper}>
                    <View style={styles.plantPot}>
                      <Ionicons name={personalPlant.icon as any} size={personalPlant.size} color={personalPlant.color} />
                    </View>
                  </View>
                  <Text style={[styles.plantLabelText, { color: activeColors.text }]}>{personalPlant.label}</Text>
                  <Text style={[styles.plantDescText, { color: activeColors.textMuted }]}>{personalPlant.desc}</Text>

                  <View style={styles.gardenXpInfo}>
                    <View style={styles.xpRow}>
                      <Text style={[styles.xpText, { color: activeColors.textMuted }]}>Опыт личного дерева</Text>
                      <Text style={styles.xpVal}>{userXP} XP</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(100, (userXP / 1500) * 100)}%` }]} />
                    </View>
                    <Text style={[styles.levelProgressInfo, { color: activeColors.textMuted }]}>
                      {userXP >= 1500 ? 'Оазис полностью выращен!' : `Прогресс до Дерева доверия (1500 XP)`}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.gardenVisualContent}>
                  {activeLobby ? (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      <View style={styles.plantVisualWrapper}>
                        <View style={styles.plantPot}>
                          <Ionicons name={(sharedPlant?.icon || 'leaf-outline') as any} size={sharedPlant?.size || 54} color={sharedPlant?.color || '#10b981'} />
                        </View>
                      </View>
                      <Text style={[styles.plantLabelText, { color: activeColors.text }]}>{sharedPlant?.label}</Text>
                      <Text style={[styles.plantDescText, { color: activeColors.textMuted }]}>{sharedPlant?.desc}</Text>

                      <View style={styles.gardenXpInfo}>
                        <View style={styles.xpRow}>
                          <Text style={[styles.xpText, { color: activeColors.textMuted }]}>Опыт Клумбы</Text>
                          <Text style={styles.xpVal}>{activeLobby.sharedPlantXp} XP</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { backgroundColor: '#10b981', width: `${Math.min(100, (activeLobby.sharedPlantXp / 4000) * 100)}%` }]} />
                        </View>
                        <Text style={[styles.levelProgressInfo, { color: activeColors.textMuted }]}>
                          Прогресс до Мега-дерева (4000 XP)
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noActiveLobbyCommunal}>
                      <Ionicons name="leaf-outline" size={32} color={activeColors.textMuted} style={{ marginBottom: 8 }} />
                      <Text style={[styles.noActiveLobbyCommunalText, { color: activeColors.textMuted }]}>
                        Вы не состоите в лобби встречи.{'\n'}Создайте его на вкладке «Хаб», чтобы качать совместный парник.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* GitHub habits calendar heatmap grid */}
            <View style={styles.heatmapCard}>
              <View style={styles.heatmapHeader}>
                <Ionicons name="calendar-outline" size={18} color="#10b981" />
                <Text style={[styles.heatmapTitle, { color: activeColors.text }]}>ОФФЛАЙН-АКТИВНОСТЬ</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                <View style={styles.heatmapGrid}>
                  {Array.from({ length: 15 }).map((_, colIndex) => (
                    <View key={colIndex} style={styles.heatmapColumn}>
                      {Array.from({ length: 7 }).map((_, rowIndex) => {
                        const dayIndex = colIndex * 7 + rowIndex;
                        const cell = heatmapData[dayIndex];
                        let cellColor = themeMode === 'light' ? '#e2e8f0' : '#1e293b'; // default 0 XP
                        if (cell.level === 1) cellColor = 'rgba(16, 185, 129, 0.15)';
                        if (cell.level === 2) cellColor = 'rgba(16, 185, 129, 0.4)';
                        if (cell.level === 3) cellColor = 'rgba(16, 185, 129, 0.7)';
                        if (cell.level === 4) cellColor = '#10b981';

                        return (
                          <TouchableOpacity 
                            key={rowIndex} 
                            activeOpacity={0.7}
                            style={[styles.heatmapCell, { backgroundColor: cellColor }]} 
                            onPress={() => Alert.alert('Офлайн-день 📅', `День ${105 - dayIndex} назад: вы детоксили и набрали ${cell.xp} XP!`)}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.heatmapLegend}>
                <Text style={[styles.heatmapLegendText, { color: activeColors.textMuted }]}>Меньше</Text>
                <View style={[styles.legendCell, { backgroundColor: themeMode === 'light' ? '#e2e8f0' : '#1e293b' }]} />
                <View style={[styles.legendCell, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]} />
                <View style={[styles.legendCell, { backgroundColor: 'rgba(16, 185, 129, 0.4)' }]} />
                <View style={[styles.legendCell, { backgroundColor: 'rgba(16, 185, 129, 0.7)' }]} />
                <View style={[styles.legendCell, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.heatmapLegendText, { color: activeColors.textMuted }]}>Больше</Text>
              </View>
            </View>

            {/* Locked Event Banner */}
            <View style={styles.lockedEventBanner}>
              <View style={styles.lockedOverlay}>
                <Ionicons name="lock-closed-outline" size={32} color="white" style={{ marginBottom: 6 }} />
                <Text style={styles.lockedEventTitle}>ЗАКРЫТЫЙ ОФФЛАЙН-ИВЕНТ</Text>
                <Text style={styles.lockedEventSubtitle}>
                  Встреча аскетов в Ботаническом саду Питера.{'\n'}
                  Требуется уровень: Дерево Доверия (1500 XP)
                </Text>
                <View style={styles.lockedEventLockTag}>
                  <Text style={styles.lockedEventLockTagText}>
                    {userXP >= 1500 
                      ? 'ВХОД ОТКРЫТ!' 
                      : `ЗАБЛОКИРОВАНО (${userXP}/1500 XP)`
                    }
                  </Text>
                </View>
              </View>
            </View>

            {/* Coupons list */}
            <View style={styles.couponsContainer}>
              <Text style={[styles.couponsHeaderTitle, { color: activeColors.text }]}>Мои оффлайн купоны ({rewards.length})</Text>

              {rewards.length === 0 ? (
                <View style={[
                  styles.emptyRewardsBox, 
                  { 
                    backgroundColor: themeMode === 'light' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }
                ]}>
                  <Ionicons name="gift-outline" size={24} color="#10b981" style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.emptyText, { color: activeColors.text, fontWeight: '700', textAlign: 'left' }]}>
                      У вас пока нет купонов.
                    </Text>
                    <Text style={[styles.emptySubtext, { color: activeColors.textMuted, textAlign: 'left', marginTop: 2, fontSize: 11 }]}>
                      Проводите детокс в кофейнях, чтобы получить скидки!
                    </Text>
                  </View>
                </View>
              ) : (
                rewards.map((reward, index) => (
                  <View key={index} style={[styles.rewardCard, { borderColor: activeColors.border, backgroundColor: activeColors.card }]}>
                    <View style={[styles.rewardCardHeader, { borderColor: activeColors.border }]}>
                      <View style={styles.rewardIconBg}>
                        <Ionicons name="cafe-outline" size={22} color="#f59e0b" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.rewardLocName, { color: activeColors.text }]}>{reward.locationName}</Text>
                        <Text style={styles.rewardTextVal}>{reward.rewardText}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.qrSection}>
                      {/* Perforated ticket QR code */}
                      <View style={styles.qrMockPlaceholder}>
                        <View style={styles.qrGrid}>
                          <View style={[styles.qrBlock, { top: 6, left: 6 }]} />
                          <View style={[styles.qrBlock, { top: 6, right: 6 }]} />
                          <View style={[styles.qrBlock, { bottom: 6, left: 6 }]} />
                          <View style={styles.qrCenterDot} />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.qrLabel, { color: activeColors.textMuted }]}>КОД НА КАССЕ</Text>
                        <Text style={[styles.qrCodeString, { color: activeColors.text }]}>{reward.code}</Text>
                        <Text style={[styles.qrExpires, { color: activeColors.textMuted }]}>Истекает: {new Date(reward.expiresAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: typeof COLORS.dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10, // adjusted safe area top
    paddingBottom: 140, 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },

  // ── LOBBY SETUP & CREATION ──
  lobbySetupBox: {
    flex: 1,
  },
  lobbyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  lobbyDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputCardLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  lobbyInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  inputBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  switchSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  createLobbyBtn: {
    backgroundColor: colors.background,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLobbyBtnText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── ACTIVE LOBBY VIEW ──
  lobbyActiveBox: {
    flex: 1,
  },
  lobbyCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  lobbyCodeLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  codeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lobbyCodeText: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  targetLocationLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  leaveLobbyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
  },
  leaveLobbyText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  plantContainer: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 20,
  },
  sharedPlantHalo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  plantBigEmoji: {
    fontSize: 54,
  },
  plantStatusLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  plantStatusName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  plantDescription: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  xpProgressContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  xpVal: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  levelProgressInfo: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },

  // ── LOBBY SQUAD SLOTS ──
  lobbySlotsGridContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  lobbySlotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  lobbySlotsTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  slotsVerticalStack: {
    gap: 10,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  slotItemEmpty: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  slotIndex: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginRight: 10,
  },
  slotAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  slotAvatarText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  slotInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slotName: {
    fontSize: 14,
    fontWeight: '800',
  },
  slotDistance: {
    fontSize: 11,
    marginTop: 2,
  },
  slotStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotStatusText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  slotEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  slotInviteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  slotInviteBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  youBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    color: '#3b82f6',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginLeft: 6,
  },

  // ── LAUNCH BUTTON ──
  launchSessionBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  launchSessionBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },

  // ── ACTIVE DETOX SCREEN ──
  blackSessionContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 4,
    opacity: 0.15,
  },
  blackSessionContent: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  blackSessionHeader: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
    textAlign: 'center',
  },
  blackSessionSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  circularTimerWrapper: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  circularTimerText: {
    color: 'white',
    fontSize: 48,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  circularMultiplier: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 1.5,
  },
  flashWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 30,
    width: '100%',
    justifyContent: 'center',
  },
  flashWarningText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionActiveMembersContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  sessionActiveLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  sessionAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  activeUserAvatarBox: {
    alignItems: 'center',
    width: 60,
  },
  activeUserAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeUserAvatarText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  activeUserAvatarName: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  giveUpBtn: {
    width: 160,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(239, 68, 68, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  giveUpBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── COUNTDOWN SCREEN OVERLAY ──
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownTitle: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  countdownNumber: {
    color: 'white',
    fontSize: 100,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier-Bold' : 'monospace',
    marginBottom: 20,
  },
  countdownSubtitle: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // ── TAB 3: МОЙ ОАЗИС SCREEN ──
  profileAvatarCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  characterContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  characterInnerHalo: {
    position: 'relative',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseCharacterEmoji: {
    fontSize: 64,
  },
  accessoryHat: {
    position: 'absolute',
    zIndex: 10,
  },
  accessoryGlasses: {
    position: 'absolute',
    top: 26,
    fontSize: 22,
    zIndex: 9,
  },
  avatarCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarCardRating: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
    marginBottom: 16,
  },
  wardrobeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    height: 38,
    paddingHorizontal: 16,
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  wardrobeBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },

  // ── WARDROBE MODAL STYLING ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  wardrobeCategoryTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  wardrobeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wardrobeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  wardrobeChipActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  wardrobeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalApplyBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalApplyBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },

  // ── GARDEN CARD STYLING ──
  gardenCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  gardenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  gardenTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  gardenSubTabs: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gardenSubTab: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  gardenSubTabActive: {
    backgroundColor: colors.card,
  },
  gardenSubTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gardenSubTabTextActive: {
    color: '#10b981',
  },
  gardenVisualContent: {
    alignItems: 'center',
  },
  plantVisualWrapper: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  plantPot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantLabelText: {
    fontSize: 16,
    fontWeight: '800',
  },
  plantDescText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  gardenXpInfo: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 12,
  },
  noActiveLobbyCommunal: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noActiveLobbyCommunalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── GITHUB HEATMAP GRID ──
  heatmapCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  heatmapTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  heatmapCell: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  heatmapLegendText: {
    fontSize: 10,
    marginHorizontal: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },

  // ── LOCKED OFFLINE EVENTS BANNER ──
  lockedEventBanner: {
    height: 140,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lockedEventTitle: {
    color: '#ffc107',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  lockedEventSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  lockedEventLockTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  lockedEventLockTagText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ── COUPON REWARDS INVENTORY ──
  couponsContainer: {
    marginBottom: 20,
  },
  couponsHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyRewardsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  rewardsProgressContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    marginBottom: 16,
  },
  rewardsProgressTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressTrackWrapper: {
    height: 12,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 20,
    marginHorizontal: 10,
  },
  progressTrackBase: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  milestoneDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -9 }],
  },
  milestonesList: {
    width: '100%',
  },
  milestoneItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  milestoneItemRowActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  milestoneStatusIconBg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  milestoneRewardName: {
    fontSize: 13,
    fontWeight: '700',
  },
  milestoneMinutesLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  milestoneRemainingText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  rewardCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  rewardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardLocName: {
    fontSize: 14,
    fontWeight: '800',
  },
  rewardTextVal: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  qrSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  qrMockPlaceholder: {
    width: 76,
    height: 76,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 6,
  },
  qrGrid: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'black',
    position: 'relative',
  },
  qrBlock: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2.5,
    borderColor: 'black',
  },
  qrCenterDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 8,
    height: 8,
    backgroundColor: 'black',
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  qrLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  qrCodeString: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginVertical: 2,
  },
  qrExpires: {
    fontSize: 10,
  },
});
