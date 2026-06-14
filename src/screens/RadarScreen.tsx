import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';

import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  TextInput,
  Linking,
} from 'react-native';

import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { LocationDto, LocationType } from '../types/location';
import { fetchNearbyLocations, setLocationFavorite } from '../api/locations';
import { fetchFriendsLocations, FriendLocationDto, FriendProfileDto, resolveAvatarUrl } from '../api/users';
import { useUserStore } from '../store/userStore';
import { useLocationStore } from '../store/locationStore';
import { useDetoxStore } from '../store/detoxStore';
import { useThemeStore } from '../store/themeStore';
import { COLORS } from '../constants/colors';
import { getRealVisibleBssids } from '../utils/wifi';
import { getPlaceImage } from '../utils/placeImages';

const SPB_CENTER = {
  latitude: 59.9391,
  longitude: 30.3158,
};

// Helper to calculate distance in km/meters
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) {
    return `${Math.round(d * 1000)} м`;
  }
  return `${d.toFixed(1)} км`;
}

function getCategoryIcon(category?: string, typeOrIsCommercial?: LocationType | boolean): any {
  let isCommercial = false;
  let type: LocationType | undefined;
  if (typeof typeOrIsCommercial === 'boolean') {
    isCommercial = typeOrIsCommercial;
  } else if (typeOrIsCommercial) {
    type = typeOrIsCommercial;
    isCommercial = type === 'COMMERCIAL';
  }

  if (type) {
    switch (type) {
      case 'COMMERCIAL': return "cafe";
      case 'SPACE': return "compass-outline";
      case 'EMBANKMENT': return "water-outline";
      case 'SQUARE': return "grid-outline";
      case 'STREET': return "trail-sign-outline";
      case 'PARK': return "leaf";
      case 'COURTYARD': return "home-outline";
      case 'BRIDGE': return "infinite-outline";
      case 'MONUMENT': return "trail-sign-outline";
      case 'SIGHT': return "eye-outline";
      case 'EVENT': return "calendar-outline";
      case 'SOCIAL': return "leaf";
    }
  }

  if (!category) return isCommercial ? "cafe" : "leaf";
  const catLower = category.toLowerCase();
  if (catLower.includes('кофе') || catLower.includes('кафе') || catLower.includes('cafe')) return "cafe";
  if (catLower.includes('парк') || catLower.includes('park') || catLower.includes('leisure')) return "leaf";
  if (catLower.includes('смотр') || catLower.includes('viewpoint')) return "eye";
  if (catLower.includes('памятник') || catLower.includes('historic') || catLower.includes('monument')) return "trail-sign";
  if (catLower.includes('мероприятие') || catLower.includes('event')) return "calendar";
  return isCommercial ? "cafe" : "leaf";
}

function formatPlaceDistance(distance?: string) {
  return distance && distance.trim() ? distance : '';
}

function tidyPlaceText(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getPlaceContext(place: any) {
  const tags = Array.isArray(place.tags) ? place.tags.filter(Boolean) : [];
  const primaryTag = tags[0];

  if (place.isPartner && (place.rewardDescription || place.reward || (place.rewardPolicies && place.rewardPolicies.length > 0))) {
    return {
      icon: 'pricetag-outline' as const,
      tone: 'partner' as const,
      title: place.rewardDescription ? 'Скидка доступна' : 'Партнёрское место',
      subtitle: place.rewardDescription || place.reward?.text || primaryTag || '',
    };
  }

  if (place.shortDescription || primaryTag) {
    return {
      icon: 'leaf-outline' as const,
      tone: 'free' as const,
      title: primaryTag || place.shortDescription,
      subtitle: place.shortDescription && primaryTag ? place.shortDescription : '',
    };
  }

  return null;
}

function openYandexMapsRoute(place: LocationDto) {
  const coords = `${place.latitude},${place.longitude}`;
  const appUrl = `yandexmaps://maps.yandex.ru/?rtext=~${coords}&rtt=pd`;
  const webUrl = `https://yandex.ru/maps/?rtext=~${coords}&rtt=pd`;

  Alert.alert('Открыть маршрут?', `Построить маршрут до "${place.name}" в Яндекс Картах?`, [
    { text: 'Отмена', style: 'cancel' },
    {
      text: 'Открыть',
      onPress: async () => {
        try {
          const canOpen = await Linking.canOpenURL(appUrl);
          await Linking.openURL(canOpen ? appUrl : webUrl);
        } catch {
          await Linking.openURL(webUrl);
        }
      },
    },
  ]);
}

function getCategoryEmoji(category?: string, typeOrIsCommercial?: LocationType | boolean): string {
  let isCommercial = false;
  let type: LocationType | undefined;
  if (typeof typeOrIsCommercial === 'boolean') {
    isCommercial = typeOrIsCommercial;
  } else if (typeOrIsCommercial) {
    type = typeOrIsCommercial;
    isCommercial = type === 'COMMERCIAL';
  }

  if (type) {
    switch (type) {
      case 'COMMERCIAL': return '☕';
      case 'SOCIAL': return '🌳';
      case 'SPACE': return '✨';
      case 'EMBANKMENT': return '🌊';
      case 'SQUARE': return '🌇';
      case 'STREET': return '🛣️';
      case 'PARK': return '🌳';
      case 'COURTYARD': return '🏡';
      case 'BRIDGE': return '🌉';
      case 'MONUMENT': return '🗿';
      case 'SIGHT': return '🏰';
      case 'EVENT': return '🎟️';
    }
  }

  if (!category) return isCommercial ? '☕' : '🌳';
  const catLower = category.toLowerCase();
  if (catLower.includes('кофе') || catLower.includes('кафе') || catLower.includes('cafe')) return '☕';
  if (catLower.includes('парк') || catLower.includes('park') || catLower.includes('leisure')) return '🌳';
  if (catLower.includes('смотр') || catLower.includes('viewpoint')) return '🔭';
  if (catLower.includes('памятник') || catLower.includes('historic') || catLower.includes('monument')) return '🏛️';
  if (catLower.includes('мероприятие') || catLower.includes('event')) return '🎟️';
  return isCommercial ? '☕' : '🌳';
}

function toHumanReadableCategory(category?: string, typeOrIsCommercial?: LocationType | boolean): string {
  let isCommercial = false;
  let type: LocationType | undefined;
  if (typeof typeOrIsCommercial === 'boolean') {
    isCommercial = typeOrIsCommercial;
  } else if (typeOrIsCommercial) {
    type = typeOrIsCommercial;
    isCommercial = type === 'COMMERCIAL';
  }

  if (type) {
    switch (type) {
      case 'COMMERCIAL': return 'Заведение-партнер';
      case 'SOCIAL': return 'Общественное пространство';
      case 'SPACE': return 'Общественное пространство';
      case 'EMBANKMENT': return 'Набережная';
      case 'SQUARE': return 'Площадь';
      case 'STREET': return 'Улица';
      case 'PARK': return 'Парк / Сад';
      case 'COURTYARD': return 'Скрытый дворик';
      case 'BRIDGE': return 'Мост';
      case 'MONUMENT': return 'Памятник / Монумент';
      case 'SIGHT': return 'Достопримечательность';
      case 'EVENT': return 'Мероприятие';
    }
  }

  if (!category) return isCommercial ? 'Заведение-партнер' : 'Общественное пространство';
  const catLower = category.trim().toLowerCase();
  if (catLower.includes('attraction') || catLower.includes('достопримечательность')) return 'Достопримечательность';
  if (catLower.includes('park') || catLower.includes('парк') || catLower.includes('leisure')) return 'Парк / Зона отдыха';
  if (catLower.includes('viewpoint') || catLower.includes('смотр')) return 'Смотровая площадка';
  if (catLower.includes('monument') || catLower.includes('памятник') || catLower.includes('historic')) return 'Памятник / Культурное место';
  if (catLower.includes('event') || catLower.includes('мероприятие')) return 'Бесплатное мероприятие';
  if (catLower.includes('cafe') || catLower.includes('кафе') || catLower.includes('кофе')) return 'Кофейня';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function cleanDescriptionText(desc?: string): string {
  if (!desc) return '';
  return desc
    .replace(/\bviewpoint\b/gi, 'смотровая площадка')
    .replace(/\battraction\b/gi, 'достопримечательность')
    .replace(/\bmonument\b/gi, 'памятник')
    .replace(/\bpark\b/gi, 'парк')
    .trim();
}

function getLocationPhotoSource(place: LocationDto) {
  const remoteUrl = place.photoUrl || place.coverImageUrl;
  return remoteUrl ? { uri: remoteUrl } : getPlaceImage(place.name);
}

function matchesTypeFilter(location: LocationDto, selectedTypeFilter: LocationType | 'ALL' | 'FRIENDS') {
  if (selectedTypeFilter === 'ALL' || selectedTypeFilter === 'FRIENDS') {
    return true;
  }
  if (location.type === selectedTypeFilter) {
    return true;
  }
  if (selectedTypeFilter === 'SPACE') {
    return location.type === 'PUBLIC_SPACE' || location.type === 'FREE_PLACE' || location.type === 'SOCIAL';
  }
  if (selectedTypeFilter === 'COMMERCIAL') {
    return location.type === 'PARTNER_CAFE';
  }
  return false;
}

async function fetchNearbyLocationsWithSpbFallback(
  latitude: number,
  longitude: number,
  popularOnly?: boolean
): Promise<{ locations: LocationDto[]; usedFallback: boolean }> {
  const nearby = await fetchNearbyLocations(latitude, longitude, popularOnly);
  if (nearby.length > 0) {
    return { locations: nearby, usedFallback: false };
  }

  const spbLocations = await fetchNearbyLocations(SPB_CENTER.latitude, SPB_CENTER.longitude, popularOnly);
  return { locations: spbLocations, usedFallback: spbLocations.length > 0 };
}

function PlaceDetailsCard({
  place,
  distance,
  isUserClose,
  isFavorite,
  onToggleFavorite,
  onPrimaryAction,
  onInvite,
}: {
  place: LocationDto;
  distance: string;
  isUserClose: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPrimaryAction: () => void;
  onInvite: () => void;
}) {
  const context = getPlaceContext(place);
  const tags = Array.isArray(place.tags) ? place.tags.filter(Boolean).slice(0, 4) : [];
  const category = toHumanReadableCategory(place.category, place.type);
  const distanceText = formatPlaceDistance(distance);

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.placeSheetScroll}>
      <View style={styles.placePhotoWrap}>
        <Image source={getLocationPhotoSource(place)} style={styles.placePhoto} resizeMode="cover" />
        <View style={styles.placePhotoShade} />
        {!!distanceText && (
          <View style={styles.placeDistancePill}>
            <Ionicons name="navigate" size={14} color="#FFFFFF" />
            <Text style={styles.placeDistanceText}>{distanceText}</Text>
          </View>
        )}
        <View style={styles.placePhotoActions}>
          <TouchableOpacity style={styles.placeRoundButton} onPress={onToggleFavorite}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#ef4444' : '#111827'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.placeInfoCard}>
        <View style={styles.placeTitleBlock}>
          <Text style={styles.placeTitle} numberOfLines={2}>{tidyPlaceText(place.name)}</Text>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {category}{distanceText ? ` · ${distanceText}` : ''}
          </Text>
        </View>

        {!!place.address && (
          <View style={styles.placeInfoRow}>
            <Ionicons name="location-outline" size={19} color="#10b981" />
            <Text style={styles.placeInfoText} numberOfLines={2}>{place.address}</Text>
          </View>
        )}

        {context && (
          <View style={[styles.placeContextCard, context.tone === 'partner' && styles.placeContextCardPartner]}>
            <View style={[styles.placeContextIcon, context.tone === 'partner' && styles.placeContextIconPartner]}>
              <Ionicons name={context.icon} size={19} color={context.tone === 'partner' ? '#b7791f' : '#10b981'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeContextTitle} numberOfLines={2}>{tidyPlaceText(context.title)}</Text>
              {!!context.subtitle && <Text style={styles.placeContextSubtitle} numberOfLines={2}>{tidyPlaceText(context.subtitle)}</Text>}
            </View>
          </View>
        )}

        <View style={styles.placeActionsRow}>
          <TouchableOpacity style={[styles.placePrimaryButton, !isUserClose && styles.placeRouteButton]} onPress={onPrimaryAction}>
            <Ionicons name={isUserClose ? 'checkmark-circle-outline' : 'navigate-outline'} size={17} color="#FFFFFF" />
            <Text style={styles.placePrimaryText}>{isUserClose ? 'Я здесь' : 'Маршрут'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.placeSecondaryButton} onPress={onInvite}>
            <Ionicons name="people-outline" size={17} color="#64748b" />
            <Text style={styles.placeSecondaryText}>Позвать</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.placeIconButton} onPress={() => Alert.alert('Поделиться', `Место: ${place.name}`)}>
            <Ionicons name="share-social-outline" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {!!place.description && (
          <View style={styles.placeDetailsBlock}>
            <Text style={styles.placeDetailsTitle}>О месте</Text>
            <Text style={styles.placeDescription}>{tidyPlaceText(cleanDescriptionText(place.description))}</Text>
          </View>
        )}

        {!!tags.length && (
          <View style={styles.placeTagsRow}>
            {tags.map((tag, index) => (
              <View key={`${tag}-${index}`} style={styles.placeTag}>
                <Text style={styles.placeTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {place.isPartner && (
          <View style={styles.placePartnerNote}>
            <Ionicons name="pricetag-outline" size={18} color="#b7791f" />
            <View style={{ flex: 1 }}>
              <Text style={styles.placePartnerTitle}>Партнёрское место</Text>
              {!!place.rewardDescription && <Text style={styles.placePartnerSub}>{place.rewardDescription}</Text>}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

interface TypeFilterOption {
  type: 'ALL' | LocationType;
  label: string;
  emoji: string;
}

const TYPE_FILTER_OPTIONS: TypeFilterOption[] = [
  { type: 'ALL', label: 'Все', emoji: '🌍' },
  { type: 'COMMERCIAL', label: 'Кафе', emoji: '🍕' },
  { type: 'EVENT', label: 'События', emoji: '🎉' },
  { type: 'PARK', label: 'Парки', emoji: '🌳' },
  { type: 'EMBANKMENT', label: 'Набережные', emoji: '🌊' },
  { type: 'SQUARE', label: 'Площади', emoji: '🌇' },
  { type: 'MONUMENT', label: 'Памятники', emoji: '🏛️' },
  { type: 'COURTYARD', label: 'Дворики', emoji: '🏡' },
  { type: 'STREET', label: 'Улицы', emoji: '🛣️' },
  { type: 'SPACE', label: 'Пространства', emoji: '🧭' },
  { type: 'BRIDGE', label: 'Мосты', emoji: '🌉' },
];

export default function RadarScreen({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const {
    locations,
    setLocations,
    selectedLocation,
    setSelectedLocation,
    friendsLocations,
    setFriendsLocations,
  } = useLocationStore();

  const { theme, toggleTheme } = useThemeStore();
  const activeThemeColors = COLORS[theme];

  const { startSession, sessionStatus } = useDetoxStore();
  
  // Layout dynamic coordinates and index mapping
  const [bottomSheetIndex, setBottomSheetIndex] = useState(-1);
  const [containerHeight, setContainerHeight] = useState(Dimensions.get('window').height);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | LocationType | 'FRIENDS'>('ALL');

  const [html, setHtml] = useState('');
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Lobbies & Friends selection states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { 
    friends, 
    loadFriends, 
    loadProfile,
    profile, 
    toggleWalkReady, 
    sendRequest, 
    incomingRequests, 
    acceptRequest, 
    removeFriendship 
  } = useUserStore();

  const [selfStatusModalVisible, setSelfStatusModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfileDto | null>(null);
  const [selectedFriendLoc, setSelectedFriendLoc] = useState<FriendLocationDto | null>(null);
  const [selectedFriendStatus, setSelectedFriendStatus] = useState<string>('Занят');
  const [showQuickSpots, setShowQuickSpots] = useState<FriendProfileDto | null>(null);
  const {
    createNewLobby,
    pendingInvitations,
    loadPendingInvitations,
    acceptInvitation,
    declineInvitation,
    inviteFriends,
    activeLobby,
  } = useDetoxStore();
  const shownInviteIds = useRef<Set<string>>(new Set());

  // --- Redesigned Header States ---
  const [myStatus, setMyStatus] = useState<'walking' | 'transit' | 'busy' | 'offline_soon'>('busy');
  const getMyStatusColor = (status: string) => {
    switch (status) {
      case 'walking':
        return '#10b981';
      case 'transit':
        return '#f59e0b';
      case 'offline_soon':
        return '#8B5CF6';
      default:
        return '#ef4444';
    }
  };
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFriendsListModal, setShowFriendsListModal] = useState(false);
  const [showFilterTagSheet, setShowFilterTagSheet] = useState(false);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [newFriendUsername, setNewFriendUsername] = useState('');

  const targetLoc = useMemo(() => {
    return selectedLocation || (locations.length > 0 ? locations[0] : null);
  }, [selectedLocation, locations]);

  const getFriendStatus = (friend: FriendProfileDto, fLoc: FriendLocationDto | undefined) => {
    if (activeLobby && activeLobby.membersUsernames.includes(friend.username)) {
      if (targetLoc && fLoc && fLoc.latitude !== 0 && fLoc.longitude !== 0) {
        // Calculate distance in meters
        const lat1 = fLoc.latitude;
        const lon1 = fLoc.longitude;
        const lat2 = targetLoc.latitude;
        const lon2 = targetLoc.longitude;
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c * 1000; // in meters
        if (d <= 150) {
          return { text: 'На месте / Готов', key: 'walking', color: '#10b981' };
        }
      }
      return { text: 'В пути', key: 'transit', color: '#f59e0b' };
    }

    const currentStatus = friend.status || (friend.readyToAirOut ? 'walking' : 'busy');
    if (currentStatus === 'walking') {
      return { text: 'Готов гулять', key: 'walking', color: '#10b981' };
    }
    if (currentStatus === 'transit') {
      return { text: 'В пути', key: 'transit', color: '#f59e0b' };
    }
    return { text: 'Занят', key: 'busy', color: '#ef4444' };
  };

  // Synchronize initial state based on profile.readyToAirOut
  useEffect(() => {
    if (profile) {
      const profileStatus = profile.status as 'walking' | 'transit' | 'busy' | 'offline_soon' | undefined;
      if (profileStatus === 'walking' || profileStatus === 'transit' || profileStatus === 'busy' || profileStatus === 'offline_soon') {
        setMyStatus(profileStatus);
      } else if (profile.readyToAirOut) {
        setMyStatus(prev => (prev === 'transit' ? 'transit' : 'walking'));
      } else {
        setMyStatus('busy');
      }
    }
  }, [profile?.readyToAirOut, profile?.status]);

  // Pulse animation for avatar ring
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (myStatus === 'walking' || myStatus === 'transit') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [myStatus]);

  // Add location to recently visited
  const addRecentLocation = (loc: any) => {
    setRecentLocations(prev => {
      const filtered = prev.filter(item => item.id !== loc.id);
      return [loc, ...filtered].slice(0, 5);
    });
  };

  useEffect(() => {
    if (selectedLocation) {
      addRecentLocation(selectedLocation);
    }
  }, [selectedLocation?.id]);

  // Load friends and incoming requests when the friends list modal is opened
  useEffect(() => {
    if (showFriendsListModal) {
      loadFriends();
    }
  }, [showFriendsListModal]);

  const handleSendFriendRequest = async () => {
    if (!newFriendUsername.trim()) {
      Alert.alert('Ошибка', 'Введите имя пользователя.');
      return;
    }
    try {
      await sendRequest(newFriendUsername.trim());
      Alert.alert('Успешно', `Заявка в друзья отправлена пользователю ${newFriendUsername.trim()}!`);
      setNewFriendUsername('');
      await loadFriends();
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить заявку.');
    }
  };

  const handleStartDetox = async () => {
    if (!selectedLocation) return;
    if (sessionStatus === 'ACTIVE' || sessionStatus === 'PAUSED') {
      Alert.alert('Ошибка', 'У вас уже запущена детокс-сессия.');
      return;
    }

    try {
      const lat = userCoords?.latitude || selectedLocation.latitude;
      const lon = userCoords?.longitude || selectedLocation.longitude;
      const fallbacks = selectedLocation.bssidList && selectedLocation.bssidList.length > 0
        ? selectedLocation.bssidList
        : ['00:11:22:33:44:55'];
      const bssids = await getRealVisibleBssids(fallbacks);

      await startSession(selectedLocation.id, lat, lon, selectedLocation.name, bssids);
      Alert.alert('Успешно', 'Цифровой детокс запущен! Очки начисляются.');
      setSelectedLocation(null);
      bottomSheetRef.current?.close();
    } catch (e: any) {
      Alert.alert('Ошибка запуска', e.message || 'Не удалось запустить сессию');
    }
  };

  const handleStartHomeDetox = () => {
    if (sessionStatus === 'ACTIVE' || sessionStatus === 'PAUSED') {
      Alert.alert('Ошибка', 'У вас уже запущена детокс-сессия.');
      return;
    }

    Alert.alert(
      'Детокс дома 🏠',
      'Начать домашнюю детокс-сессию? Вы сможете копить очки детокса, не выходя на улицу.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Начать',
          onPress: async () => {
            try {
              await startSession('00000000-0000-0000-0000-000000000000', 0, 0, 'Домашний детокс', []);
              Alert.alert('Успешно', 'Домашний детокс запущен!');
            } catch (e: any) {
              Alert.alert('Ошибка запуска', e.message || 'Не удалось запустить домашнюю сессию');
            }
          }
        }
      ]
    );
  };

  const handleOpenInviteModal = async () => {
    await loadFriends();
    setSelectedFriends([]);
    setShowInviteModal(true);
  };

  const toggleFriendSelection = (username: string) => {
    setSelectedFriends(prev => 
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleSendInvitations = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Выбор друзей', 'Пожалуйста, выберите хотя бы одного друга.');
      return;
    }
    
    try {
      await createNewLobby(true);
      await inviteFriends(selectedFriends);
      const updatedLobby = useDetoxStore.getState().activeLobby;
      const code = updatedLobby?.code || 'DX-XXX';
      
      Alert.alert(
        'Приглашения отправлены! 💬',
        `Вы организовали встречу в "${selectedLocation?.name}".\n\nКод лобби: ${code}\nДрузья (${selectedFriends.join(', ')}) приглашены.`,
        [{ text: 'Отлично', onPress: () => {
          setShowInviteModal(false);
          useDetoxStore.getState().setActiveTab('social');
        } }]
      );
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось создать встречу');
    }
  };

  // Periodically fetch friends locations
  useEffect(() => {
    if (!html) return;
    
    let active = true;
    const loadFriendsLocs = async () => {
      try {
        const data = await fetchFriendsLocations();
        if (!active) return;
        setFriendsLocations(data);
        
        const mergedFriends = data.map(fLoc => {
          const matchingFriend = friends.find(f => f.username === fLoc.username);
          let statusStr = 'busy';
          if (matchingFriend) {
            statusStr = getFriendStatus(matchingFriend, fLoc).key;
          } else if (fLoc.status) {
            statusStr = fLoc.status;
          } else if (fLoc.latitude !== 0 && fLoc.longitude !== 0) {
            statusStr = 'walking';
          }
          return {
            ...fLoc,
            status: statusStr,
            avatarUrl: resolveAvatarUrl(matchingFriend?.avatarUrl),
            displayName: matchingFriend?.displayName || matchingFriend?.username || fLoc.username,
          };
        });

        const jsPayload = `if (window.setFriendsLocations) { window.setFriendsLocations(${JSON.stringify(mergedFriends)}); } void(0);`;
        webViewRef.current?.injectJavaScript(jsPayload);
      } catch (err) {
        console.error("Error loading friends locations:", err);
      }
    };

    loadFriendsLocs();
    const interval = setInterval(loadFriendsLocs, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [html, selectedTypeFilter, friends]);

  // Periodically poll for invitations
  useEffect(() => {
    const pollInvites = async () => {
      await loadPendingInvitations();
    };
    pollInvites();
    const interval = setInterval(pollInvites, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle showing alert when new invitations arrive
  useEffect(() => {
    if (pendingInvitations.length === 0) return;
    pendingInvitations.forEach(inv => {
      if (shownInviteIds.current.has(inv.invitationId)) return;
      shownInviteIds.current.add(inv.invitationId);
      
      Alert.alert(
        'Приглашение на встречу! 👥',
        `Пользователь ${inv.inviterUsername} зовет вас присоединиться к детоксу!\nКод лобби: ${inv.lobbyCode}`,
        [
          {
            text: 'Отклонить',
            style: 'cancel',
            onPress: () => declineInvitation(inv.invitationId)
          },
          {
            text: 'Принять',
            style: 'default',
            onPress: async () => {
              try {
                await acceptInvitation(inv.invitationId);
                Alert.alert('Принято!', 'Вы вошли в лобби встречи. Перейдите в Профиль -> Наш Парник.');
              } catch (e: any) {
                Alert.alert('Ошибка', e.message || 'Не удалось войти в лобби');
              }
            }
          }
        ]
      );
    });
  }, [pendingInvitations]);

  // Filter popularity toggle support
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterPopular, setFilterPopular] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!html || !userCoords) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const loadFilteredLocations = async () => {
      try {
        const result = await fetchNearbyLocationsWithSpbFallback(userCoords.latitude, userCoords.longitude, filterPopular);
        setLocations(result.locations);
        if (result.usedFallback) {
          webViewRef.current?.injectJavaScript(
            `if (map) { map.setView([${SPB_CENTER.latitude}, ${SPB_CENTER.longitude}], 12, { animate: true, duration: 0.8 }); } void(0);`
          );
        }
      } catch (err) {
        console.error("Error fetching filtered locations:", err);
      }
    };
    loadFilteredLocations();
  }, [filterPopular, html, userCoords]);

  const activeFilterCount = [filterPopular].filter(Boolean).length;

  const webViewRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '60%'], []);

  const filteredLocations = useMemo(() => {
    if (selectedTypeFilter === 'ALL') {
      return locations;
    }
    if (selectedTypeFilter === 'FRIENDS') {
      return locations.filter(loc => {
        return friendsLocations.some(fLoc => {
          if (fLoc.latitude === 0 && fLoc.longitude === 0) return false;
          // Calculate distance in meters
          const lat1 = loc.latitude;
          const lon1 = loc.longitude;
          const lat2 = fLoc.latitude;
          const lon2 = fLoc.longitude;
          const R = 6371;
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c * 1000;
          return d <= 200; // Friends within 200m of this location
        });
      });
    }
    return locations.filter(loc => matchesTypeFilter(loc, selectedTypeFilter));
  }, [locations, selectedTypeFilter, friendsLocations]);

  // Synchronize Leaflet map when locations list filters change
  useEffect(() => {
    if (!html) return;
    const jsPayload = `if (window.setLocations) { window.setLocations(${JSON.stringify(filteredLocations)}); } void(0);`;
    webViewRef.current?.injectJavaScript(jsPayload);
  }, [filteredLocations, html]);

  useEffect(() => {
    loadMap();
    loadProfile().catch(err => console.error(err));
  }, []);

  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = async () => {
    if (!selectedLocation) return;
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      const saved = await setLocationFavorite(selectedLocation.id, next);
      setIsFavorite(saved);
      loadProfile().catch(err => console.error(err));
    } catch (e: any) {
      setIsFavorite(!next);
      Alert.alert('Не удалось обновить избранное', e?.response?.data || e?.message || 'Попробуйте еще раз');
    }
  };

  // Bi-directional synchronization: selectedLocation changes -> update Leaflet
  useEffect(() => {
    setIsFavorite(!!selectedLocation && !!profile?.favoritePlaces?.some(place => place.id === selectedLocation.id));
    if (selectedLocation) {
      setSelectedFriend(null);
      setShowQuickSpots(null);
      webViewRef.current?.injectJavaScript(
        `if (window.setActiveMarker) { window.setActiveMarker('${selectedLocation.id}'); } void(0);`
      );
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      webViewRef.current?.injectJavaScript(
        `if (window.setActiveMarker) { window.setActiveMarker(null); } void(0);`
      );
      if (!selectedFriend) {
        bottomSheetRef.current?.close();
      }
    }
  }, [selectedLocation, profile?.favoritePlaces]);

  // Handle selectedFriend change
  useEffect(() => {
    if (selectedFriend) {
      setSelectedLocation(null);
      setShowQuickSpots(null);
      bottomSheetRef.current?.snapToIndex(0);
    } else if (!selectedLocation) {
      bottomSheetRef.current?.close();
    }
  }, [selectedFriend]);

  const handleTapFriend = (friend: FriendProfileDto, fLoc: FriendLocationDto | undefined, status: string) => {
    setSelectedFriend(friend);
    setSelectedFriendLoc(fLoc || null);
    setSelectedFriendStatus(status);
    
    const hasGeo = fLoc && fLoc.latitude !== 0 && fLoc.longitude !== 0;
    if (hasGeo) {
      webViewRef.current?.injectJavaScript(
        `if (map) { map.setView([${fLoc.latitude}, ${fLoc.longitude}], 15, { animate: true, duration: 0.8 }); } void(0);`
      );
    }
  };

  const handleFriendInviteFlow = async (friend: FriendProfileDto) => {
    const inviteSpot = selectedLocation || (locations.length > 0 ? locations[0] : null);
    if (inviteSpot) {
      try {
        await createNewLobby(true);
        await inviteFriends([friend.username]);
        Alert.alert(
          'Приглашение отправлено! 💬',
          `Вы позвали ${friend.username} в "${inviteSpot.name}". Инвайт отправлен.`,
          [{ text: 'ОК' }]
        );
      } catch (e: any) {
        Alert.alert('Ошибка', e.message || 'Не удалось отправить инвайт');
      }
    } else {
      setShowQuickSpots(friend);
    }
  };

  async function loadMap() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;
      setUserCoords({ latitude, longitude });

      const locationResult = await fetchNearbyLocationsWithSpbFallback(latitude, longitude);
      const fetchedLocations = locationResult.locations;
      const mapLatitude = locationResult.usedFallback ? SPB_CENTER.latitude : latitude;
      const mapLongitude = locationResult.usedFallback ? SPB_CENTER.longitude : longitude;
      setLocations(fetchedLocations);

      const locationsJson = JSON.stringify(fetchedLocations);

      const mapHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
          <style>
            html, body, #map {
              height: 100%;
              margin: 0;
              padding: 0;
              background: #0f172a;
            }
            
            /* Calm pastel light map style */
            .light-theme-map .leaflet-tile {
              filter: saturate(0.85) contrast(0.96);
            }
            .light-theme-map {
              background: #f4f2ee !important;
            }
            
            /* Refined slate dark map style */
            .dark-theme-map .leaflet-tile {
              filter: none;
            }
            .dark-theme-map {
              background: #0f172a !important;
            }

            .leaflet-control-zoom, .leaflet-control-attribution {
              display: none !important;
            }
            
            /* User Position Marker */
            .user-location-marker {
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            .friend-avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .user-dot-wrapper {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 24px;
              height: 24px;
            }
            .user-dot {
              width: 12px;
              height: 12px;
              background: #355f52;
              border: 2px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 8px 18px rgba(53, 95, 82, 0.26);
              z-index: 2;
            }
            .user-pulse {
              position: absolute;
              width: 24px;
              height: 24px;
              background: rgba(53, 95, 82, 0.24);
              border-radius: 50%;
              animation: pulse 2s infinite ease-out;
              z-index: 1;
            }
            @keyframes pulse {
              0% { transform: scale(0.6); opacity: 1; }
              100% { transform: scale(2.2); opacity: 0; }
            }
            
            /* Category Pins */
            .custom-marker-pin {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              filter: drop-shadow(0 5px 10px rgba(17, 24, 39, 0.16));
              transition: transform 0.18s ease;
            }
            .pin-container {
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
            }
            .pin-bubble {
              width: 32px;
              height: 32px;
              border: 2px solid rgba(255,255,255,0.94);
              border-radius: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
              z-index: 2;
              box-shadow: 0 2px 6px rgba(17, 24, 39, 0.12);
            }
            .pin-pointer {
              display: none;
            }
            .pin-partner .pin-bubble {
              width: 36px;
              height: 36px;
              border-radius: 18px;
              background: #1f2a25 !important;
              box-shadow: 0 8px 18px rgba(31, 42, 37, 0.25);
            }
            .pin-free .pin-bubble {
              width: 30px;
              height: 30px;
              border-radius: 15px;
            }
            .pin-free-high .pin-bubble {
              width: 34px;
              height: 34px;
              border-radius: 17px;
              box-shadow: 0 7px 16px rgba(17, 24, 39, 0.2);
            }
            .pin-event .pin-bubble {
              width: 36px;
              height: 36px;
              border-radius: 18px;
              background: #7c5cff !important;
              box-shadow: 0 9px 20px rgba(124, 92, 255, 0.3);
            }
            .pin-meeting .pin-bubble {
              width: 38px;
              height: 38px;
              border-radius: 19px;
              background: #e85d5d !important;
              box-shadow: 0 10px 22px rgba(232, 93, 93, 0.32);
            }
            .pin-green .pin-bubble { background: #5f8d6a !important; }
            .pin-water .pin-bubble { background: #4f8fa3 !important; }
            .pin-urban .pin-bubble { background: #8a7a63 !important; }
            .pin-culture .pin-bubble { background: #6d6478 !important; }
            .dark-theme-map .pin-green .pin-bubble { background: #5b9a80 !important; }
            .dark-theme-map .pin-water .pin-bubble { background: #5ba3b5 !important; }
            .dark-theme-map .pin-urban .pin-bubble { background: #a38e73 !important; }
            .dark-theme-map .pin-culture .pin-bubble { background: #8d7fa3 !important; }
            .dark-theme-map .pin-partner .pin-bubble { background: #d9e8df !important; }
            .dark-theme-map .pin-event .pin-bubble { background: #9b82ff !important; }
            .dark-theme-map .pin-meeting .pin-bubble { background: #f87171 !important; }
            .dark-theme-map .pin-partner svg { stroke: #1f2a25; }
            }
            .pin-icon {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .pin-free svg {
              width: 16px;
              height: 16px;
            }
            .pin-partner svg,
            .pin-event svg,
            .pin-meeting svg {
              width: 17px;
              height: 17px;
            }
            .zoom-street .pin-free .pin-bubble {
              width: 34px;
              height: 34px;
              border-radius: 17px;
            }
            .custom-marker-pin.active .pin-bubble {
              transform: scale(1.35) translateY(-2px);
              border-color: #ffffff !important;
              box-shadow: 0 12px 28px rgba(17, 24, 39, 0.3) !important;
              z-index: 1000 !important;
            }
            
            /* Friend Pins */
            .friend-location-marker {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .friend-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              filter: drop-shadow(0 10px 22px rgba(17, 24, 39, 0.2));
            }
            .friend-avatar-wrapper {
              position: relative;
              width: 46px;
              height: 46px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid rgba(255,255,255,0.92);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 2;
            }
            .friend-avatar {
              width: 38px;
              height: 38px;
              border-radius: 50%;
              background: linear-gradient(135deg, #53616f 0%, #1f2937 100%);
              color: white;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 12px;
              font-weight: 800;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .friend-avatar-glow {
              position: absolute;
              width: 54px;
              height: 54px;
              border-radius: 50%;
              background: rgba(53, 95, 82, 0.12);
              animation: friendPulse 3s infinite ease-out;
              z-index: 1;
              pointer-events: none;
            }
            @keyframes friendPulse {
              0% { transform: scale(0.85); opacity: 1; }
              100% { transform: scale(1.4); opacity: 0; }
            }
            .friend-status-dot {
              position: absolute;
              bottom: 1px;
              right: 1px;
              width: 11px;
              height: 11px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              z-index: 3;
            }
            .friend-container.status-walking .friend-status-dot {
              background: #10b981;
            }
            .friend-container.status-transit .friend-status-dot {
              background: #f59e0b;
            }
            .friend-container.status-busy .friend-status-dot {
              background: #ef4444;
            }
            .friend-pointer {
              display: none;
            }
            .friend-name-tag {
              background: rgba(255,255,255,0.92);
              color: #111827;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: 10px;
              font-weight: 700;
              padding: 3px 7px;
              border-radius: 999px;
              margin-top: 6px;
              white-space: nowrap;
              border: 1px solid rgba(17,24,39,0.06);
              box-shadow: 0 6px 16px rgba(17,24,39,0.12);
              pointer-events: none;
            }
            
            /* Clustered markers custom concepts */
            .custom-marker-cluster {
              background: transparent !important;
            }
            .custom-marker-cluster div {
              text-align: center;
              border-radius: 50%;
              font-weight: 700;
              font-size: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 1px solid #d1d5db !important;
              width: 34px;
              height: 34px;
              box-shadow: 0 10px 24px rgba(17, 24, 39, 0.14);
            }
            .light-theme-map .custom-marker-cluster div {
              background-color: #ffffff !important;
              color: #111827 !important;
            }
            .dark-theme-map .custom-marker-cluster div {
              background-color: rgba(28,37,47,0.92) !important;
              color: #d7efe2 !important;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
          <script>
            let map;
            let currentTileLayer;
            let markersGroup;
            const markersMap = {};
            const markerMeta = {};
            const friendsMarkers = {};
            let activeMarkerId = null;
            
            map = L.map('map', {
              zoomControl: false,
              attributionControl: false
            }).setView([${mapLatitude}, ${mapLongitude}], 12);
            
            window.setMapTheme = function(themeName) {
              if (currentTileLayer) {
                map.removeLayer(currentTileLayer);
              }
              const url = themeName === 'light'
                ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
              
              currentTileLayer = L.tileLayer(url, { maxZoom: 20 }).addTo(map);
              
              const container = document.getElementById('map');
              if (themeName === 'light') {
                container.classList.add('light-theme-map');
                container.classList.remove('dark-theme-map');
              } else {
                container.classList.add('dark-theme-map');
                container.classList.remove('light-theme-map');
              }
            };
            
            setMapTheme('${theme}');

            function updateZoomHierarchy() {
              const container = document.getElementById('map');
              if (!container) return;
              const zoom = map.getZoom();
              container.classList.toggle('zoom-city', zoom <= 12);
              container.classList.toggle('zoom-district', zoom >= 13 && zoom <= 14);
              container.classList.toggle('zoom-near', zoom >= 15 && zoom <= 16);
              container.classList.toggle('zoom-street', zoom >= 17);
              refreshVisibleLocations();
            }
            updateZoomHierarchy();
            map.on('zoomend', updateZoomHierarchy);
            
            // User marker
            const userIcon = L.divIcon({
              className: 'user-location-marker',
              html: '<div class="user-dot-wrapper"><div class="user-pulse"></div><div class="user-dot"></div></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            L.marker([${latitude}, ${longitude}], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
            
            markersGroup = L.markerClusterGroup({
              showCoverageOnHover: false,
              spiderfyOnMaxZoom: true,
              zoomToBoundsOnClick: true,
              maxClusterRadius: 50,
              iconCreateFunction: function(cluster) {
                const childCount = cluster.getChildCount();
                return new L.DivIcon({
                  html: '<div><span>' + childCount + '</span></div>',
                  className: 'custom-marker-cluster',
                  iconSize: new L.Point(36, 36)
                });
              }
            });
            map.addLayer(markersGroup);
            
            function getSvgIcon(type, category, isCommercial, markerClass) {
              const strokeColor = 'white';
              const cafeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line></svg>';
              const parkSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 8.5C18 15 15 18 11 20z"></path><path d="M19 2c-2.26 4.33-5.27 7.14-8 10"></path></svg>';
              const viewSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
              const monSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="22" x2="22" y2="22"></line><line x1="4" y1="22" x2="4" y2="8"></line><line x1="20" y1="22" x2="20" y2="8"></line><line x1="8" y1="22" x2="8" y2="8"></line><line x1="16" y1="22" x2="16" y2="8"></line><line x1="12" y1="22" x2="12" y2="8"></line><path d="M12 2v6"></path><path d="M4 8h16"></path></svg>';
              const eventSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
              const spaceSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m16.2 7.8-2 5.6-5.6 2 2-5.6 5.6-2z"></path></svg>';
              const waterSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C5.8 7 7 5 9.5 5c2.5 0 3.7 2 5 2 1.3 0 2.5-.5 3-1M2 12c.6.5 1.2 1 2.5 1 1.3 0 2.5-2 5-2 2.5 0 3.7 2 5 2 1.3 0 2.5-.5 3-1M2 18c.6.5 1.2 1 2.5 1 1.3 0 2.5-2 5-2 2.5 0 3.7 2 5 2 1.3 0 2.5-.5 3-1"></path></svg>';
              const squareSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18M15 3v18M3 9h18M3 15h18"></path></svg>';
              const streetSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V2M20 22V2M12 2v2M12 8v4M12 16v4"></path></svg>';
              const courtyardSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
              const bridgeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="' + strokeColor + '" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20c3-3 6-5 9-5s6 2 9 5M3 12h18M12 12v3M6 12v1.5M18 12v1.5"></path></svg>';

              if (type) {
                const typeUpper = type.toUpperCase();
                if (typeUpper === 'COMMERCIAL') return cafeSvg;
                if (typeUpper === 'PARTNER_CAFE') return cafeSvg;
                if (typeUpper === 'SPACE') return spaceSvg;
                if (typeUpper === 'PUBLIC_SPACE') return spaceSvg;
                if (typeUpper === 'FREE_PLACE') return spaceSvg;
                if (typeUpper === 'SOCIAL') return spaceSvg;
                if (typeUpper === 'EMBANKMENT') return waterSvg;
                if (typeUpper === 'SQUARE') return squareSvg;
                if (typeUpper === 'STREET') return streetSvg;
                if (typeUpper === 'PARK') return parkSvg;
                if (typeUpper === 'COURTYARD') return courtyardSvg;
                if (typeUpper === 'BRIDGE') return bridgeSvg;
                if (typeUpper === 'MONUMENT') return monSvg;
                if (typeUpper === 'SIGHT') return viewSvg;
                if (typeUpper === 'EVENT') return eventSvg;
              }

              if (!category) return isCommercial ? cafeSvg : parkSvg;
              const cat = category.toLowerCase();
              if (cat.includes("кофе") || cat.includes("cafe") || cat.includes("coffee") || cat.includes("кафе")) return cafeSvg;
              if (cat.includes("парк") || cat.includes("park") || cat.includes("leisure")) return parkSvg;
              if (cat.includes("смотр") || cat.includes("viewpoint")) return viewSvg;
              if (cat.includes("памятник") || cat.includes("historic") || cat.includes("monument")) return monSvg;
              if (cat.includes("event") || cat.includes("мероприятие")) return eventSvg;
              return isCommercial ? cafeSvg : parkSvg;
            }

            function getFreePlaceClass(type) {
              const normalized = String(type || '').toUpperCase();
              if (normalized === 'EMBANKMENT' || normalized === 'BRIDGE') return 'pin-water';
              if (normalized === 'COURTYARD' || normalized === 'STREET' || normalized === 'SPACE') return 'pin-urban';
              if (normalized === 'MONUMENT' || normalized === 'SIGHT') return 'pin-culture';
              return 'pin-green';
            }

            function shouldShowLocation(meta, zoom) {
              if (meta.isPartner || meta.isEvent || meta.id === activeMarkerId) return true;
              if (zoom <= 12) return meta.isPopular;
              if (zoom <= 14) {
                return meta.isPopular || meta.qualityScore >= 80 ||
                  ['PARK', 'EMBANKMENT', 'MONUMENT', 'SIGHT'].includes(meta.type);
              }
              return true;
            }

            function refreshVisibleLocations() {
              if (!markersGroup) return;
              const zoom = map.getZoom();
              markersGroup.clearLayers();
              Object.keys(markersMap).forEach(id => {
                const marker = markersMap[id];
                const meta = markerMeta[id];
                if (meta && shouldShowLocation(meta, zoom)) {
                  markersGroup.addLayer(marker);
                }
              });
            }
            
            window.setLocations = function(locs) {
              markersGroup.clearLayers();
              for (let id in markersMap) delete markersMap[id];
              for (let id in markerMeta) delete markerMeta[id];
              
              locs.forEach(location => {
                const lat = Number(location.latitude);
                const lon = Number(location.longitude);
                const typeUpper = String(location.type || '').toUpperCase();
                const isCommercial = Boolean(location.isPartner) || typeUpper === 'COMMERCIAL' || typeUpper === 'PARTNER_CAFE';
                const isEvent = typeUpper === 'EVENT';
                const isFree = !isCommercial && !isEvent;
                const score = Number(location.qualityScore || 0);
                let colorClass = 'pin-free ' + getFreePlaceClass(typeUpper);
                if (isCommercial) {
                  colorClass = 'pin-partner';
                } else if (isEvent) {
                  colorClass = 'pin-event';
                } else if (isFree && score >= 80) {
                  colorClass += ' pin-free-high';
                }
                const svg = getSvgIcon(location.type, location.category, isCommercial, colorClass);
                
                const icon = L.divIcon({
                  className: 'custom-marker-pin ' + colorClass,
                  html: '<div class="pin-container"><div class="pin-bubble">' + svg + '</div><div class="pin-pointer"></div></div>',
                  iconSize: isCommercial || isEvent ? [38, 38] : [30, 30],
                  iconAnchor: isCommercial || isEvent ? [19, 19] : [15, 15]
                });
                
                const zIndexOffset = isCommercial ? 700 : isEvent ? 900 : (location.isPopular ? 400 : 100);
                const marker = L.marker([lat, lon], { icon, zIndexOffset });
                markersMap[location.id] = marker;
                markerMeta[location.id] = {
                  id: String(location.id),
                  type: typeUpper,
                  isPartner: isCommercial,
                  isEvent: isEvent,
                  isPopular: Boolean(location.isPopular),
                  qualityScore: score
                };
                
                marker.on('click', () => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'markerPress',
                    location: location
                  }));
                  window.setActiveMarker(location.id);
                });
                
              });
              refreshVisibleLocations();
            };
            
            window.setActiveMarker = function(id) {
              if (activeMarkerId && markersMap[activeMarkerId]) {
                const prevEl = markersMap[activeMarkerId].getElement();
                if (prevEl) prevEl.classList.remove('active');
              }
              activeMarkerId = id;
              refreshVisibleLocations();
              if (id && markersMap[id]) {
                const marker = markersMap[id];
                markersGroup.zoomToShowLayer(marker, function() {
                  const el = marker.getElement();
                  if (el) el.classList.add('active');
                  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true, duration: 0.5 });
                });
              }
            };
            
            window.centerOnUser = function() {
              map.setView([${latitude}, ${longitude}], 15, { animate: true, duration: 0.8 });
            };
            window.zoomIn = () => map.zoomIn();
            window.zoomOut = () => map.zoomOut();
            
            window.setFriendsLocations = function(friends) {
              for (let username in friendsMarkers) {
                map.removeLayer(friendsMarkers[username]);
                delete friendsMarkers[username];
              }
              friends.forEach(friend => {
                const lat = Number(friend.latitude);
                const lon = Number(friend.longitude);
                if (lat === 0 && lon === 0) return;
                
                const initials = String(friend.displayName || friend.username).substring(0, 1).toUpperCase();
                const statusClass = 'status-' + (friend.status || 'walking');
                const avatarHtml = friend.avatarUrl
                  ? '<img src="' + friend.avatarUrl + '" alt="" />'
                  : initials;
                const icon = L.divIcon({
                  className: 'friend-location-marker',
                  html: '<div class="friend-container ' + statusClass + '"><div class="friend-avatar-wrapper"><div class="friend-avatar-glow"></div><div class="friend-avatar">' + avatarHtml + '</div><div class="friend-status-dot"></div></div><div class="friend-pointer"></div></div><div class="friend-name-tag">' + (friend.displayName || friend.username) + '</div>',
                  iconSize: [58, 68],
                  iconAnchor: [29, 34]
                });
                
                const marker = L.marker([lat, lon], { icon, zIndexOffset: 1500 }).addTo(map);
                friendsMarkers[friend.username] = marker;

                marker.on('click', () => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'friendPress',
                    username: friend.username
                  }));
                });
              });
            };
            
            map.on('click', (e) => {
              if (e.originalEvent.target.closest('.custom-marker-pin') || e.originalEvent.target.closest('.marker-cluster')) return;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
              window.setActiveMarker(null);
            });
            
            // Draw initial locations
            setLocations(${locationsJson});
          </script>
        </body>
        </html>
      `;
      setHtml(mapHtml);
    } catch (e) {
      console.log('MAP ERROR:', e);
    }
  }

  // WebView message dispatcher
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') {
        setSelectedLocation(data.location);
      } else if (data.type === 'friendPress') {
        const foundFriend = friends.find(f => f.username === data.username);
        const fLoc = friendsLocations.find(l => l.username === data.username);
        if (foundFriend) {
          const statusInfo = getFriendStatus(foundFriend, fLoc);
          handleTapFriend(foundFriend, fLoc, statusInfo.text);
        }
      } else if (data.type === 'mapPress') {
        setSelectedLocation(null);
        setSelectedFriend(null);
      }
    } catch (error) {
      console.warn('Error parsing WebView message:', error);
    }
  };

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `if (window.setMapTheme) { window.setMapTheme('${theme}'); } void(0);`
    );
  }, [theme]);

  const handleCenterUser = () => {
    webViewRef.current?.injectJavaScript(`if (window.centerOnUser) { window.centerOnUser(); } void(0);`);
  };

  const handleZoomIn = () => {
    webViewRef.current?.injectJavaScript(`if (window.zoomIn) { window.zoomIn(); } void(0);`);
  };

  const handleZoomOut = () => {
    webViewRef.current?.injectJavaScript(`if (window.zoomOut) { window.zoomOut(); } void(0);`);
  };

  const distanceStr = useMemo(() => {
    if (!userCoords || !selectedLocation) return '';
    return getDistanceKm(userCoords.latitude, userCoords.longitude, selectedLocation.latitude, selectedLocation.longitude);
  }, [userCoords, selectedLocation]);

  const isUserClose = useMemo(() => {
    if (!userCoords || !selectedLocation) return false;
    const lat1 = userCoords.latitude;
    const lon1 = userCoords.longitude;
    const lat2 = selectedLocation.latitude;
    const lon2 = selectedLocation.longitude;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c * 1000;
    return d <= 150;
  }, [userCoords, selectedLocation]);

  const isCommercial = selectedLocation?.type === 'COMMERCIAL';

  // --- Smart Search Memos ---
  const readyFriends = useMemo(() => {
    return friends.filter(f => {
      const fLoc = friendsLocations.find(l => l.username === f.username);
      const statusInfo = getFriendStatus(f, fLoc);
      return statusInfo.text === 'Готов гулять' || statusInfo.text === 'На месте / Готов';
    });
  }, [friends, friendsLocations, activeLobby, targetLoc]);

  const filteredSearchFriends = useMemo(() => {
    if (!searchQuery) return [];
    return friends.filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [friends, searchQuery]);

  const filteredSearchLocations = useMemo(() => {
    if (!searchQuery) return [];
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [locations, searchQuery]);

  return (
    <View 
      style={[styles.container, { backgroundColor: activeThemeColors.background }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >


      {/* ── Friends Invite modal ── */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <Pressable style={styles.inviteOverlay} onPress={() => setShowInviteModal(false)}>
          <Pressable style={[styles.invitePanel, { backgroundColor: activeThemeColors.card, borderColor: activeThemeColors.border }]} onPress={() => {}}>
            <View style={styles.inviteHeader}>
              <View>
                <Text style={[styles.inviteTitleText, { color: activeThemeColors.text }]}>Позвать друзей</Text>
                <Text style={[styles.inviteSubtitleText, { color: activeThemeColors.textMuted }]}>Встреча в: {selectedLocation?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={activeThemeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterDivider, { backgroundColor: activeThemeColors.border }]} />
            <ScrollView style={styles.friendsSelectScroll} contentContainerStyle={{ gap: 10 }}>
              {friends.length === 0 ? (
                <Text style={[styles.emptyFriendsText, { color: activeThemeColors.textMuted }]}>У вас пока нет друзей в списке.</Text>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedFriends.includes(friend.username);
                  return (
                    <TouchableOpacity
                      key={friend.username}
                      style={[
                        styles.friendSelectItem,
                        {
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : activeThemeColors.background,
                          borderColor: isSelected ? '#3b82f6' : activeThemeColors.border,
                        }
                      ]}
                      onPress={() => toggleFriendSelection(friend.username)}
                    >
                      <View style={styles.friendSelectInfo}>
                        <View style={[styles.friendSelectAvatar, { backgroundColor: '#3b82f6' }]}>
                          <Text style={styles.friendSelectAvatarText}>{friend.username.substring(0, 2).toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={[styles.friendSelectName, { color: activeThemeColors.text }]}>{friend.username}</Text>
                          <Text style={[styles.friendSelectRating, { color: activeThemeColors.textMuted }]}>Рейтинг: {friend.socialRating} XP</Text>
                        </View>
                      </View>
                      <View style={[styles.friendSelectCheckbox, { backgroundColor: isSelected ? '#3b82f6' : 'transparent', borderColor: isSelected ? '#3b82f6' : activeThemeColors.border }]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.inviteActions}>
              <TouchableOpacity style={[styles.inviteBtn, styles.inviteCancelBtn, { borderColor: activeThemeColors.border }]} onPress={() => setShowInviteModal(false)}>
                <Text style={[styles.inviteCancelBtnText, { color: activeThemeColors.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.inviteBtn, styles.inviteSendBtn]}
                onPress={handleSendInvitations}
              >
                <Text style={styles.inviteSendBtnText}>Создать комнату</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Redesigned Floating Header Bar */}
      {!(selectedLocation !== null || selectedFriend !== null) && (
        <View style={[
          styles.floatingHeaderBar,
          {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            shadowColor: 'transparent',
          }
        ]}>
          {/* Left Avatar Button */}
          <View style={styles.avatarContainer}>
            {(myStatus === 'walking' || myStatus === 'transit') && (
              <Animated.View style={[
                styles.pulseRing,
                {
                  borderColor: getMyStatusColor(myStatus),
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.15],
                    outputRange: [0.8, 0],
                  }),
                }
              ]} />
            )}
            <TouchableOpacity
              style={[
                styles.avatarRing,
                {
                  borderColor: activeThemeColors.card,
                  backgroundColor: activeThemeColors.card,
                }
              ]}
              onPress={onOpenProfile || (() => setShowFriendsListModal(true))}
            >
              {resolveAvatarUrl(profile?.avatarUrl) ? (
                <Image source={{ uri: resolveAvatarUrl(profile?.avatarUrl)! }} style={{ width: 42, height: 42, borderRadius: 21 }} />
              ) : (
                <View style={[styles.avatarInner, { backgroundColor: activeThemeColors.border }]}>
                  <Text style={[styles.avatarInitials, { color: activeThemeColors.primary }]}>{(profile?.displayName || profile?.username || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Center Search Input */}
          <TouchableOpacity
            style={[
              styles.searchBarInputWrapper,
              {
                backgroundColor: activeThemeColors.card,
                borderColor: 'transparent',
                shadowColor: activeThemeColors.shadow,
              }
            ]}
            activeOpacity={0.9}
            onPress={() => setIsSearchActive(true)}
          >
            <Ionicons name="search" size={16} color={activeThemeColors.textMuted} style={{ marginRight: 6 }} />
            {isSearchActive ? (
              <TextInput
                style={[styles.searchBarTextInput, { color: activeThemeColors.text }]}
                placeholder="Найти место или друга..."
                placeholderTextColor={activeThemeColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                onBlur={() => {
                  if (!searchQuery) {
                    setIsSearchActive(false);
                  }
                }}
              />
            ) : (
              <Text style={[styles.searchBarTextPlaceholder, { color: activeThemeColors.textMuted }]}>
                {searchQuery || 'Найти место или друга...'}
              </Text>
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={activeThemeColors.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Right Filter button */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeThemeColors.card,
                borderColor: 'transparent',
                shadowColor: activeThemeColors.shadow,
              }
            ]}
            onPress={() => setShowFilterTagSheet(true)}
          >
            <Ionicons name="options-outline" size={18} color={selectedTypeFilter !== 'ALL' ? activeThemeColors.primary : activeThemeColors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Active Search suggestions screen overlay */}
      {isSearchActive && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={styles.searchOverlayBackdrop} onPress={() => setIsSearchActive(false)} />
          <View style={[styles.searchSuggestionsContainer, { backgroundColor: activeThemeColors.card, borderColor: activeThemeColors.border }]}>
            {!searchQuery ? (
              <View style={{ flex: 1 }}>
                <Text style={[styles.searchSectionTitle, { color: activeThemeColors.textMuted }]}>ГОТОВЫ ГУЛЯТЬ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.readyFriendsScroll}>
                  {readyFriends.length === 0 ? (
                    <Text style={[styles.emptySearchText, { color: activeThemeColors.textMuted }]}>Все заняты 📭</Text>
                  ) : (
                    readyFriends.map(friend => {
                      const fLoc = friendsLocations.find(l => l.username === friend.username);
                      return (
                        <TouchableOpacity
                          key={friend.username}
                          style={styles.readyFriendChip}
                          onPress={() => {
                            setIsSearchActive(false);
                            const statusInfo = getFriendStatus(friend, fLoc);
                            handleTapFriend(friend, fLoc, statusInfo.text);
                          }}
                        >
                          <View style={[styles.readyFriendAvatar, { backgroundColor: '#7c3aed' }]}>
                            <Text style={styles.readyFriendAvatarText}>{friend.username.substring(0, 2).toUpperCase()}</Text>
                          </View>
                          <Text style={[styles.readyFriendName, { color: activeThemeColors.text }]} numberOfLines={1}>{friend.username}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                <Text style={[styles.searchSectionTitle, { color: activeThemeColors.textMuted, marginTop: 16 }]}>НЕДАВНИЕ МЕСТА</Text>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
                  {recentLocations.length === 0 ? (
                    <Text style={[styles.emptySearchText, { color: activeThemeColors.textMuted }]}>История пуста 🧭</Text>
                  ) : (
                    recentLocations.map(loc => (
                      <TouchableOpacity
                        key={loc.id}
                        style={[styles.recentPlaceItem, { borderColor: activeThemeColors.border }]}
                        onPress={() => {
                          setIsSearchActive(false);
                          setSelectedLocation(loc);
                        }}
                      >
                        <Ionicons name="time-outline" size={16} color={activeThemeColors.textMuted} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeColors.text }}>{loc.name}</Text>
                          <Text style={{ fontSize: 10, color: activeThemeColors.textMuted }}>{toHumanReadableCategory(loc.category, loc.type)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                <Text style={[styles.searchSectionTitle, { color: activeThemeColors.textMuted }]}>ДРУЗЬЯ</Text>
                {filteredSearchFriends.length === 0 ? (
                  <Text style={[styles.emptySearchText, { color: activeThemeColors.textMuted, marginVertical: 6 }]}>Никого не найдено</Text>
                ) : (
                  filteredSearchFriends.map(friend => {
                    const fLoc = friendsLocations.find(l => l.username === friend.username);
                    const statusInfo = getFriendStatus(friend, fLoc);
                    const statusText = statusInfo.text;
                    return (
                      <TouchableOpacity
                        key={friend.username}
                        style={[styles.searchResultFriendItem, { borderColor: activeThemeColors.border }]}
                        onPress={() => {
                          setIsSearchActive(false);
                          handleTapFriend(friend, fLoc, statusText);
                        }}
                      >
                        <View style={[styles.friendAvatarInner, { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', marginRight: 10 }]}>
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 10 }}>{friend.username.substring(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeColors.text }}>{friend.username}</Text>
                          <Text style={{ fontSize: 10, color: activeThemeColors.textMuted }}>{statusText} • {friend.socialRating} XP</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}

                <Text style={[styles.searchSectionTitle, { color: activeThemeColors.textMuted, marginTop: 12 }]}>ЛОКАЦИИ И ЗАВЕДЕНИЯ</Text>
                {filteredSearchLocations.length === 0 ? (
                  <Text style={[styles.emptySearchText, { color: activeThemeColors.textMuted, marginVertical: 6 }]}>Места не найдены</Text>
                ) : (
                  filteredSearchLocations.map(loc => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.searchResultPlaceItem, { borderColor: activeThemeColors.border }]}
                      onPress={() => {
                        setIsSearchActive(false);
                        setSelectedLocation(loc);
                      }}
                    >
                      <Ionicons name={getCategoryIcon(loc.category, loc.type)} size={16} color="#10b981" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeColors.text }}>{loc.name}</Text>
                        <Text style={{ fontSize: 10, color: activeThemeColors.textMuted }}>{toHumanReadableCategory(loc.category, loc.type)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Filter Tag Bottom Modal ("Микшер локаций") */}
      <Modal
        visible={showFilterTagSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterTagSheet(false)}
      >
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilterTagSheet(false)}>
          <Pressable style={[styles.filterPanel, { backgroundColor: activeThemeColors.card, borderColor: activeThemeColors.border }]} onPress={() => {}}>
            <View style={styles.filterPanelHeader}>
              <Text style={[styles.filterPanelTitle, { color: activeThemeColors.text }]}>Микшер локаций</Text>
              <TouchableOpacity onPress={() => {
                setSelectedTypeFilter('ALL');
                setShowFilterTagSheet(false);
              }}>
                <Text style={[styles.filterResetText, { color: '#10b981' }]}>Сбросить</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.filterDivider, { backgroundColor: activeThemeColors.border }]} />
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 16 }}>
                {[
                  { type: 'ALL', label: 'Все', emoji: '🌍' },
                  { type: 'COMMERCIAL', label: 'Кафе', emoji: '☕' },
                  { type: 'SOCIAL', label: 'Общественные', emoji: '🌳' },
                  { type: 'SPACE', label: 'Пространства', emoji: '✨' },
                  { type: 'EMBANKMENT', label: 'Набережные', emoji: '🌊' },
                  { type: 'SQUARE', label: 'Площади', emoji: '🌇' },
                  { type: 'STREET', label: 'Улицы', emoji: '🛣️' },
                  { type: 'PARK', label: 'Парки', emoji: '🌳' },
                  { type: 'COURTYARD', label: 'Дворики', emoji: '🏡' },
                  { type: 'BRIDGE', label: 'Мосты', emoji: '🌉' },
                  { type: 'MONUMENT', label: 'Памятники', emoji: '🏛️' },
                  { type: 'SIGHT', label: 'Достопримечательности', emoji: '🏰' },
                  { type: 'EVENT', label: 'События', emoji: '🎟️' },
                  { type: 'FRIENDS', label: 'Где друзья', emoji: '👥' },
                ].map((tag) => {
                  const isTagActive = selectedTypeFilter === tag.type;
                  return (
                    <TouchableOpacity
                      key={tag.type}
                      style={[
                        styles.filterTagChip,
                        {
                          backgroundColor: isTagActive ? '#10b981' : activeThemeColors.background,
                          borderColor: isTagActive ? '#10b981' : activeThemeColors.border,
                        }
                      ]}
                      onPress={() => {
                        setSelectedTypeFilter(tag.type as any);
                        setShowFilterTagSheet(false);
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{tag.emoji}</Text>
                      <Text style={[styles.filterTagChipText, { color: isTagActive ? 'white' : activeThemeColors.text }]}>
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Friends Phone Book Modal */}
      <Modal
        visible={showFriendsListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFriendsListModal(false)}
      >
        <Pressable style={styles.filterOverlay} onPress={() => setShowFriendsListModal(false)}>
          <Pressable style={[styles.friendsPhoneBookPanel, { backgroundColor: activeThemeColors.card, borderColor: activeThemeColors.border }]} onPress={() => {}}>
            <View style={styles.filterPanelHeader}>
              <Text style={[styles.filterPanelTitle, { color: activeThemeColors.text }]}>Мой Оффлайн-Клуб</Text>
              <TouchableOpacity onPress={() => setShowFriendsListModal(false)}>
                <Ionicons name="close" size={24} color={activeThemeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterDivider, { backgroundColor: activeThemeColors.border }]} />
            
            <TouchableOpacity 
              style={[
                styles.myStatusPhoneBookTrigger,
                {
                  backgroundColor: activeThemeColors.background,
                  borderColor: activeThemeColors.border,
                }
              ]}
              onPress={() => {
                setSelfStatusModalVisible(true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[
                  styles.statusOptionIndicator,
                  {
                    backgroundColor: myStatus === 'walking'
                      ? '#10b981'
                      : myStatus === 'transit'
                      ? '#f59e0b'
                      : '#ef4444',
                  }
                ]} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: activeThemeColors.text }}>
                  Мой статус: {myStatus === 'walking' ? 'Готов гулять' : myStatus === 'transit' ? 'В пути' : 'Занят'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={activeThemeColors.textMuted} />
            </TouchableOpacity>

            {/* Добавить друга по нику */}
            <View style={[styles.addFriendContainer, { borderColor: activeThemeColors.border }]}>
              <TextInput
                style={[styles.addFriendInput, { color: activeThemeColors.text, borderColor: activeThemeColors.border, backgroundColor: activeThemeColors.background }]}
                placeholder="Никнейм друга..."
                placeholderTextColor={activeThemeColors.textMuted}
                value={newFriendUsername}
                onChangeText={setNewFriendUsername}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={[styles.addFriendBtn, { backgroundColor: '#10b981' }]}
                onPress={handleSendFriendRequest}
              >
                <Ionicons name="person-add-outline" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.addFriendBtnText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {/* Запросы в друзья */}
            {incomingRequests && incomingRequests.length > 0 && (
              <View style={[styles.incomingRequestsContainer, { borderColor: activeThemeColors.border }]}>
                <Text style={[styles.incomingRequestsTitle, { color: activeThemeColors.text }]}>
                  Заявки в друзья ({incomingRequests.length})
                </Text>
                <ScrollView style={{ maxHeight: 120 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
                  {incomingRequests.map((req) => (
                    <View key={req.username} style={styles.incomingRequestItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.friendAvatarInner, { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7c3aed', marginRight: 10 }]}>
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 10 }}>
                            {req.username.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeColors.text }} numberOfLines={1}>
                          {req.username}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.reqActionBtn, { backgroundColor: '#10b981' }]}
                          onPress={async () => {
                            try {
                              await acceptRequest(req.username);
                              Alert.alert('Успешно', `Вы приняли заявку от ${req.username}`);
                            } catch (e: any) {
                              Alert.alert('Ошибка', e.message || 'Не удалось принять заявку');
                            }
                          }}
                        >
                          <Ionicons name="checkmark" size={14} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reqActionBtn, { backgroundColor: '#ef4444' }]}
                          onPress={async () => {
                            try {
                              await removeFriendship(req.username);
                              Alert.alert('Отклонено', `Вы отклонили заявку от ${req.username}`);
                            } catch (e: any) {
                              Alert.alert('Ошибка', e.message || 'Не удалось отклонить заявку');
                            }
                          }}
                        >
                          <Ionicons name="close" size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={[styles.filterDivider, { backgroundColor: activeThemeColors.border, marginVertical: 8, marginBottom: 0 }]} />
              </View>
            )}

            <ScrollView style={{ maxHeight: 350 }} contentContainerStyle={{ gap: 12 }}>
              {friends.length === 0 ? (
                <Text style={[styles.emptySearchText, { color: activeThemeColors.textMuted }]}>
                  Список друзей пуст. Добавьте друзей во вкладке Профиль.
                </Text>
              ) : (
                friends.map(friend => {
                  const fLoc = friendsLocations.find(l => l.username === friend.username);
                  const statusInfo = getFriendStatus(friend, fLoc);
                  const friendStatusText = statusInfo.text;
                  const friendStatusColor = statusInfo.color;
                  
                  return (
                    <View key={friend.username} style={[styles.phoneBookItem, { borderColor: activeThemeColors.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.friendAvatarInner, { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', marginRight: 12 }]}>
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 12 }}>
                            {friend.username.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: activeThemeColors.text }}>
                            {friend.username}
                          </Text>
                          <Text style={{ fontSize: 12, color: friendStatusColor, fontWeight: '600', marginTop: 2 }}>
                            {friendStatusText} • {friend.socialRating} XP
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.phoneBookActionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }]}
                          onPress={() => {
                            Alert.alert('Маякнуть 📡', `Вы отправили маяк пользователю ${friend.username}.`);
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#d97706' }}>МАЯК</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.phoneBookActionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }]}
                          onPress={() => {
                            setShowFriendsListModal(false);
                            handleFriendInviteFlow(friend);
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#2563eb' }}>ПОЗВАТЬ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Floating Home Focus Button (Bottom-left, layout-safe) */}
      {!(selectedLocation !== null || selectedFriend !== null) && (
        <TouchableOpacity 
          style={[
            styles.homeFocusButton, 
            { 
              backgroundColor: activeThemeColors.glass,
              borderColor: activeThemeColors.border,
              shadowColor: activeThemeColors.shadow,
              bottom: bottomSheetIndex === 0
                ? containerHeight * 0.35 + 16
                : bottomSheetIndex === 1
                ? containerHeight * 0.60 + 16
                : (Platform.OS === 'ios' ? 140 : 120)
            }
          ]} 
          onPress={handleStartHomeDetox}
        >
          <Ionicons name="home-outline" size={17} color={activeThemeColors.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.homeFocusButtonText, { color: activeThemeColors.text }]}>Домашний фокус</Text>
        </TouchableOpacity>
      )}

      {/* Self Status Modal Selection Trigger */}
      <Modal visible={selfStatusModalVisible} transparent animationType="fade" onRequestClose={() => setSelfStatusModalVisible(false)}>
        <Pressable style={styles.filterOverlay} onPress={() => setSelfStatusModalVisible(false)}>
          <Pressable style={[styles.filterPanel, { backgroundColor: activeThemeColors.card, borderColor: activeThemeColors.border }]} onPress={() => {}}>
            <Text style={[styles.filterPanelTitle, { color: activeThemeColors.text, marginBottom: 16 }]}>Мой статус</Text>
            
            <TouchableOpacity 
              style={[styles.statusOption, { borderColor: myStatus === 'walking' ? '#10b981' : activeThemeColors.border }]}
              onPress={async () => {
                await toggleWalkReady('walking');
                setMyStatus('walking');
                setSelfStatusModalVisible(false);
              }}
            >
              <View style={[styles.statusOptionIndicator, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.statusOptionText, { color: activeThemeColors.text }]}>Готов гулять</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusOption, { borderColor: myStatus === 'transit' ? '#f59e0b' : activeThemeColors.border }]}
              onPress={async () => {
                await toggleWalkReady('transit'); // Treat "In transit" as active ready
                setMyStatus('transit');
                setSelfStatusModalVisible(false);
              }}
            >
              <View style={[styles.statusOptionIndicator, { backgroundColor: '#f59e0b' }]} />
              <Text style={[styles.statusOptionText, { color: activeThemeColors.text }]}>В пути</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statusOption, { borderColor: myStatus === 'busy' ? '#ef4444' : activeThemeColors.border }]}
              onPress={async () => {
                await toggleWalkReady('busy');
                setMyStatus('busy');
                setSelfStatusModalVisible(false);
              }}
            >
              <View style={[styles.statusOptionIndicator, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.statusOptionText, { color: activeThemeColors.text }]}>Занят</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Map WebView */}
      {html ? (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.map}
          onMessage={handleMessage}
        />
      ) : (
        <View style={[styles.loadingContainer, { backgroundColor: activeThemeColors.background }]}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { color: activeThemeColors.textMuted }]}>Загрузка карты...</Text>
        </View>
      )}

      {/* Floating controls container with Dynamic Offset */}
      {!(selectedLocation !== null || selectedFriend !== null) && (
        <View style={[
          styles.controlsContainer,
          {
            bottom: bottomSheetIndex === 0
              ? containerHeight * 0.35 + 16
              : bottomSheetIndex === 1
              ? containerHeight * 0.60 + 16
              : (Platform.OS === 'ios' ? 140 : 120)
          }
        ]}>
          {/* Theme Toggle */}
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: activeThemeColors.glass, borderColor: activeThemeColors.border, shadowColor: activeThemeColors.shadow }]} onPress={toggleTheme}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={activeThemeColors.text} />
          </TouchableOpacity>

          {/* Zoom controls */}
          <View style={[styles.zoomGroup, { backgroundColor: activeThemeColors.glass, borderColor: activeThemeColors.border, shadowColor: activeThemeColors.shadow }]}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Ionicons name="add-outline" size={22} color={activeThemeColors.text} />
            </TouchableOpacity>
            <View style={[styles.zoomDivider, { backgroundColor: activeThemeColors.border }]} />
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Ionicons name="remove-outline" size={22} color={activeThemeColors.text} />
            </TouchableOpacity>
          </View>

          {/* Locate Me */}
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: activeThemeColors.glass, borderColor: activeThemeColors.border, shadowColor: activeThemeColors.shadow }]} onPress={handleCenterUser}>
            <Ionicons name="locate-outline" size={20} color={activeThemeColors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Details Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onChange={(index) => {
          setBottomSheetIndex(index);
          if (index === -1) {
            setSelectedLocation(null);
            setSelectedFriend(null);
          }
        }}
        backgroundStyle={{ backgroundColor: activeThemeColors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}
        handleIndicatorStyle={{ backgroundColor: theme === 'light' ? '#cbd5e1' : '#334155', width: 40 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          {selectedFriend ? (
            // FRIEND DETAILS CARD
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {showQuickSpots ? (
                // Quick invite spots list (when no place was selected)
                <View style={{ flex: 1 }}>
                  <Text style={[styles.gowallaTitle, { color: activeThemeColors.text, marginBottom: 8 }]}>Куда позовем?</Text>
                  <Text style={[styles.gowallaSubtitle, { color: activeThemeColors.textMuted, marginBottom: 16 }]}>
                    Выберите место для встречи с {showQuickSpots.username}:
                  </Text>
                  {locations.slice(0, 3).map((loc) => (
                    <TouchableOpacity 
                      key={loc.id} 
                      style={[
                        styles.quickSpotItem, 
                        { 
                          backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', 
                          borderColor: activeThemeColors.border,
                          padding: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          marginBottom: 8
                        }
                      ]}
                      onPress={async () => {
                        try {
                          setSelectedLocation(loc);
                          await createNewLobby(true);
                          await inviteFriends([showQuickSpots.username]);
                          setShowQuickSpots(null);
                          Alert.alert(
                            'Встреча создана! 🌳',
                            `Вы пригласили ${showQuickSpots.username} в "${loc.name}". Инвайт отправлен!`,
                            [{ text: 'Отлично' }]
                          );
                        } catch (err: any) {
                          Alert.alert('Ошибка', err.message || 'Не удалось создать встречу');
                        }
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: activeThemeColors.text }}>{loc.name}</Text>
                      <Text style={{ fontSize: 12, color: activeThemeColors.textMuted, marginTop: 2 }}>
                        {toHumanReadableCategory(loc.category, loc.type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity 
                    style={[styles.gowallaActionButton, { backgroundColor: activeThemeColors.border, marginTop: 12 }]} 
                    onPress={() => setShowQuickSpots(null)}
                  >
                    <Text style={[styles.gowallaActionButtonText, { color: activeThemeColors.text }]}>Назад</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // General Friend Card
                <View style={{ flex: 1 }}>
                  <View style={styles.gowallaHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[
                        styles.gowallaFriendAvatarOutline, 
                        { 
                          borderColor: (selectedFriendStatus === 'Готов гулять' || selectedFriendStatus === 'На месте / Готов')
                            ? '#10b981' 
                            : selectedFriendStatus === 'В пути' 
                            ? '#f59e0b' 
                            : '#ef4444',
                          borderWidth: 2.5,
                          borderRadius: 24,
                          padding: 2
                        }
                      ]}>
                        <View style={[styles.friendAvatarInner, { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7c3aed' }]}>
                          <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>
                            {selectedFriend.username.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.gowallaTitle, { color: activeThemeColors.text }]}>{selectedFriend.username}</Text>
                        <Text style={[styles.gowallaSubtitle, { color: activeThemeColors.textMuted }]}>
                          {selectedFriendStatus} • Рейтинг: {selectedFriend.socialRating} XP
                        </Text>
                      </View>
                    </View>
                  </View>

                  {!selectedFriendLoc || (selectedFriendLoc.latitude === 0 && selectedFriendLoc.longitude === 0) ? (
                    // Scenario B: Geoposition is OFF
                    <View style={{ marginTop: 8 }}>
                      <View style={[styles.gowallaGeoOffBox, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 }]}>
                        <Ionicons name="eye-off-outline" size={28} color="#ef4444" style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, color: activeThemeColors.text, textAlign: 'center', fontWeight: '600', lineHeight: 18 }}>
                          {selectedFriend.username} скрыл геопозицию, но сейчас у него статус «{selectedFriendStatus}»
                        </Text>
                      </View>
                      <View style={styles.gowallaActionsRow}>
                        <TouchableOpacity 
                          style={[styles.gowallaActionButton, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' }]} 
                          onPress={() => Alert.alert('Маякнуть 📡', `Вы отправили маяк пользователю ${selectedFriend.username}.`)}
                        >
                          <Ionicons name="notifications-outline" size={18} color="#d97706" style={{ marginRight: 6 }} />
                          <Text style={[styles.gowallaActionButtonText, { color: '#d97706' }]}>МАЯКНУТЬ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.gowallaActionButton, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.25)' }]} 
                          onPress={() => handleFriendInviteFlow(selectedFriend)}
                        >
                          <Ionicons name="people-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
                          <Text style={[styles.gowallaActionButtonText, { color: '#2563eb' }]}>ПОЗВАТЬ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Scenario A: Geoposition is ON
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.gowallaStatsRow}>
                        <View style={[styles.gowallaStatCard, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', borderColor: activeThemeColors.border }]}>
                          <View style={[styles.gowallaStatIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="navigate" size={18} color="#10b981" />
                          </View>
                          <View style={styles.gowallaStatTextContainer}>
                            <Text style={[styles.gowallaStatNumber, { color: activeThemeColors.text }]}>
                              {userCoords 
                                ? getDistanceKm(userCoords.latitude, userCoords.longitude, selectedFriendLoc.latitude, selectedFriendLoc.longitude)
                                : '1.2 км'}
                            </Text>
                            <Text style={[styles.gowallaStatLabel, { color: activeThemeColors.textMuted }]}>РАССТОЯНИЕ</Text>
                          </View>
                        </View>

                        <View style={[styles.gowallaStatCard, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', borderColor: activeThemeColors.border }]}>
                          <View style={[styles.gowallaStatIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Ionicons name="leaf" size={18} color="#f59e0b" />
                          </View>
                          <View style={styles.gowallaStatTextContainer}>
                            <Text style={[styles.gowallaStatNumber, { color: activeThemeColors.text }]}>
                              {selectedFriend.personalPlantStatus === 'SEED' ? 'Семечко' : selectedFriend.personalPlantStatus === 'SPROUT' ? 'Росток' : 'Дерево'}
                            </Text>
                            <Text style={[styles.gowallaStatLabel, { color: activeThemeColors.textMuted }]}>РАСТЕНИЕ</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.gowallaActionsRow}>
                        <TouchableOpacity 
                          style={[styles.gowallaActionButton, { backgroundColor: '#10b981' }]} 
                          onPress={() => handleFriendInviteFlow(selectedFriend)}
                        >
                          <Ionicons name="people-outline" size={18} color="white" style={{ marginRight: 6 }} />
                          <Text style={styles.gowallaActionButtonText}>ПОЗВАТЬ НА ВСТРЕЧУ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          ) : selectedLocation ? (
            <PlaceDetailsCard
              place={selectedLocation}
              distance={distanceStr}
              isUserClose={isUserClose}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onPrimaryAction={isUserClose ? handleStartDetox : () => openYandexMapsRoute(selectedLocation)}
              onInvite={handleOpenInviteModal}
            />
          ) : selectedLocation! && false ? (
            // LOCATION DETAILS CARD (Gowalla style)
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Header section: Title and Subtitle and Action buttons */}
              <View style={styles.gowallaHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.gowallaTitle, { color: activeThemeColors.text }]}>
                    {selectedLocation!.name}
                  </Text>
                  <Text style={[styles.gowallaSubtitle, { color: activeThemeColors.textMuted }]}>
                    {toHumanReadableCategory(selectedLocation!.category, selectedLocation!.type)}
                    {distanceStr ? ` • ${distanceStr}` : ''}
                  </Text>
                </View>
                <View style={styles.gowallaHeaderActions}>
                  <TouchableOpacity 
                    style={[styles.gowallaHeaderBtn, { backgroundColor: activeThemeColors.background, borderColor: activeThemeColors.border }]}
                    onPress={() => Alert.alert('Списки', 'Место добавлено в ваши списки!')}
                  >
                    <Ionicons name="list-outline" size={18} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.gowallaHeaderBtn, 
                      { 
                        backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.1)' : activeThemeColors.background, 
                        borderColor: isFavorite ? '#ef4444' : activeThemeColors.border 
                      }
                    ]}
                    onPress={() => setIsFavorite(v => !v)}
                  >
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? '#ef4444' : activeThemeColors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats Cards Section */}
              <View style={styles.gowallaStatsRow}>
                <View style={[styles.gowallaStatCard, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', borderColor: activeThemeColors.border, flex: 1 }]}>
                  <View style={[styles.gowallaStatIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="gift-outline" size={18} color="#3b82f6" />
                  </View>
                  <View style={styles.gowallaStatTextContainer}>
                    <Text style={[styles.gowallaStatNumber, { color: '#10b981' }]}>
                      {isCommercial ? '+50 XP' : '+30 XP'}
                    </Text>
                    <Text style={[styles.gowallaStatLabel, { color: activeThemeColors.textMuted }]}>ОЧКИ ДЕТОКСА</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons Bar */}
              <View style={styles.gowallaActionsRow}>
                {isUserClose ? (
                  <>
                    <TouchableOpacity style={[styles.gowallaActionButton, { backgroundColor: '#10b981', marginRight: 8 }]} onPress={handleStartDetox}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.gowallaActionButtonText}>Я ЗДЕСЬ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.gowallaActionButton, { backgroundColor: '#3b82f6', marginRight: 8 }]} onPress={handleOpenInviteModal}>
                      <Ionicons name="people-outline" size={18} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.gowallaActionButtonText}>ПОЗВАТЬ</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={[styles.gowallaActionButton, { backgroundColor: '#3b82f6', marginRight: 8 }]} onPress={handleOpenInviteModal}>
                    <Ionicons name="people-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.gowallaActionButtonText}>ПОЗВАТЬ</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.gowallaWebButton, { backgroundColor: theme === 'light' ? '#f1f5f9' : '#1e293b', borderColor: activeThemeColors.border }]}
                  onPress={() => Alert.alert('Поделиться', `Вы поделились местом: ${selectedLocation!.name}`)}
                >
                  <Ionicons name="share-social-outline" size={18} color={activeThemeColors.text} />
                </TouchableOpacity>
              </View>

              {/* Description Section */}
              {selectedLocation!.description ? (
                <View style={styles.gowallaDescriptionContainer}>
                  <View style={[styles.gowallaDivider, { backgroundColor: activeThemeColors.border }]} />
                  <Text style={[styles.gowallaDescriptionTitle, { color: activeThemeColors.text }]}>О месте</Text>
                  <Text style={[styles.gowallaDescription, { color: activeThemeColors.textMuted }]}>
                    {cleanDescriptionText(selectedLocation!.description)}
                  </Text>
                </View>
              ) : null}

              {/* Reward Policies / Discounts Section for Commercial Locations */}
              {selectedLocation!.type === 'COMMERCIAL' && (
                <View style={{ marginTop: 12 }}>
                  <View style={[styles.gowallaDivider, { backgroundColor: activeThemeColors.border }]} />
                  <Text style={[styles.gowallaDescriptionTitle, { color: activeThemeColors.text, marginBottom: 8 }]}>🎁 Акции и Скидки заведения</Text>
                  
                  {selectedLocation!.rewardPolicies && selectedLocation!.rewardPolicies!.length > 0 ? (
                    selectedLocation!.rewardPolicies!.map((policy, idx) => (
                      <View key={idx} style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: theme === 'light' ? '#f8fafc' : '#1e293b', 
                        padding: 10, 
                        borderRadius: 12, 
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: activeThemeColors.border
                      }}>
                        <Ionicons name="gift-outline" size={20} color="#10b981" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: activeThemeColors.text }}>
                            {policy.rewardText}
                          </Text>
                          <Text style={{ fontSize: 11, color: activeThemeColors.textMuted, marginTop: 2 }}>
                            Требуется: {policy.requiredMinutes} мин. детокса
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: 13, color: activeThemeColors.textMuted, fontStyle: 'italic', marginBottom: 8 }}>
                      В данный момент активных акций нет.
                    </Text>
                  )}

                  <View style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                    borderWidth: 1, 
                    borderColor: 'rgba(16, 185, 129, 0.15)', 
                    borderRadius: 12, 
                    padding: 12,
                    marginTop: 6
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#10b981', marginBottom: 4 }}>💡 КАК ПОЛУЧИТЬ НАГРАДУ:</Text>
                    <Text style={{ fontSize: 11, lineHeight: 16, color: activeThemeColors.textMuted }}>
                      1. Нажмите кнопку «Я ЗДЕСЬ» или позовите друзей.{'\n'}
                      2. Запустится детокс-сессия. Не сворачивайте приложение и не пользуйтесь телефоном.{'\n'}
                      3. По завершении сессии купон со скидкой автоматически появится в вашем «Оазисе».
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ color: activeThemeColors.textMuted }}>Выберите точку или друга на карте</Text>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    right: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  homeFocusButton: {
    position: 'absolute',
    left: 16,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    zIndex: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  homeFocusButtonText: {
    color: '#355F52',
    fontSize: 12,
    fontWeight: '600',
  },
  friendsPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 112 : 102,
    left: 16,
    right: 16,
    height: 90,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 10,
  },
  friendsPanelContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingRight: 20,
    gap: 12,
  },
  friendAvatarWrapper: {
    alignItems: 'center',
    width: 60,
  },
  friendAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  friendAvatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarInitials: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  friendAvatarName: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    width: '100%',
  },
  friendsDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    marginHorizontal: 4,
  },
  noFriendsContainer: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  noFriendsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  meBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#1a1d24',
  },
  meBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '900',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
    width: '100%',
  },
  statusOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  gowallaFriendAvatarOutline: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gowallaFriendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gowallaFriendAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  gowallaGeoOffBox: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  gowallaGeoOffText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  quickSpotItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    width: '100%',
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  filterButton: {
    padding: 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  filterResetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterDivider: {
    height: 1,
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChipTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterChipSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  filterCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  filterApplyBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterApplyBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    gap: 10,
    zIndex: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  zoomGroup: {
    borderRadius: 22,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    width: '60%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  gowallaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gowallaTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gowallaSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  gowallaHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  gowallaHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gowallaStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gowallaStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  gowallaStatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gowallaStatTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gowallaStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  gowallaStatLabel: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  gowallaFriendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  gowallaFriendsAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  gowallaMiniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gowallaMiniAvatarText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  gowallaFriendsText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  gowallaActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  gowallaActionButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  gowallaActionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
  gowallaWebButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gowallaDescriptionContainer: {
    marginTop: 4,
  },
  gowallaDivider: {
    height: 1,
    marginBottom: 14,
  },
  gowallaDescriptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  gowallaDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeSheetScroll: { paddingHorizontal: 8, paddingBottom: 16 },
  placePhotoWrap: { height: 174, borderRadius: 22, overflow: 'hidden', backgroundColor: '#e5e7eb', marginBottom: 10 },
  placePhoto: { width: '100%', height: '100%' },
  placePhotoShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.04)' },
  placeDistancePill: { position: 'absolute', left: 12, top: 12, minHeight: 30, borderRadius: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(17,24,39,0.72)' },
  placeDistanceText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  placePhotoActions: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 8 },
  placeRoundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  placeInfoCard: { borderRadius: 22, backgroundColor: '#FFFFFF', padding: 14, gap: 13 },
  placeTitleBlock: { gap: 3 },
  placeTitle: { color: '#111827', fontSize: 20, fontWeight: '700', letterSpacing: -0.25, lineHeight: 25 },
  placeMeta: { color: '#64748b', fontSize: 12, fontWeight: '600', lineHeight: 16 },
  placeInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeInfoText: { flex: 1, color: '#64748b', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  placeContextCard: { minHeight: 54, borderRadius: 16, backgroundColor: '#f2f6f3', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeContextCardPartner: { backgroundColor: '#fbf6ea' },
  placeContextIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e2eee7', alignItems: 'center', justifyContent: 'center' },
  placeContextIconPartner: { backgroundColor: '#fdecc8' },
  placeContextTitle: { color: '#1f2937', fontSize: 12, fontWeight: '700', lineHeight: 15 },
  placeContextSubtitle: { color: '#64748b', fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 1 },
  placeActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placePrimaryButton: { flex: 1.16, height: 44, borderRadius: 16, backgroundColor: '#355F52', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  placeRouteButton: { backgroundColor: '#26322e' },
  placePrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  placeSecondaryButton: { flex: 0.95, height: 44, borderRadius: 16, backgroundColor: '#f3f5f4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12 },
  placeSecondaryText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  placeIconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#e6ebe8', alignItems: 'center', justifyContent: 'center' },
  placeDetailsBlock: { gap: 4 },
  placeDetailsTitle: { color: '#111827', fontSize: 13, fontWeight: '800', lineHeight: 17 },
  placeDescription: { color: '#64748b', fontSize: 12, fontWeight: '500', lineHeight: 17 },
  placeTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  placeTag: { borderRadius: 14, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6 },
  placeTagText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  placePartnerNote: { borderRadius: 17, backgroundColor: '#fff7e6', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  placePartnerTitle: { color: '#1f2937', fontSize: 12, fontWeight: '700', lineHeight: 15 },
  placePartnerSub: { color: '#64748b', fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 1 },
  inviteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  invitePanel: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inviteTitleText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  inviteSubtitleText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  friendsSelectScroll: {
    maxHeight: 250,
    marginVertical: 16,
  },
  emptyFriendsText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 20,
  },
  friendSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  friendSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendSelectAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendSelectAvatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  friendSelectName: {
    fontSize: 15,
    fontWeight: '700',
  },
  friendSelectRating: {
    fontSize: 12,
    marginTop: 2,
  },
  friendSelectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  inviteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCancelBtn: {
    borderWidth: 1,
  },
  inviteCancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  inviteSendBtn: {
    backgroundColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteSendBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  typeFiltersContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 122 : 112,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 10,
  },
  typeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  typeFilterChipText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  floatingHeaderBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    right: 16,
    height: 58,
    borderRadius: 29,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    zIndex: 100,
    elevation: 0,
  },
  avatarContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
  },
  searchBarInputWrapper: {
    flex: 1,
    marginHorizontal: 8,
    height: 56,
    borderRadius: 28,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  searchBarTextInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    height: '100%',
  },
  searchBarTextPlaceholder: {
    flex: 1,
    fontSize: 14,
  },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  searchOverlayBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 90,
  },
  searchSuggestionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 106,
    left: 16,
    right: 16,
    maxHeight: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  readyFriendsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  emptySearchText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  readyFriendChip: {
    alignItems: 'center',
    width: 50,
  },
  readyFriendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyFriendAvatarText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  readyFriendName: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
  },
  recentPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  searchResultFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  searchResultPlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  filterTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  filterTagChipText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  friendsPhoneBookPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  myStatusPhoneBookTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  phoneBookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  phoneBookActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addFriendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addFriendInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addFriendBtn: {
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addFriendBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  incomingRequestsContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  incomingRequestsTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  incomingRequestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reqActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
