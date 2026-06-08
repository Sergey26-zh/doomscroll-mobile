import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { FriendProfileDto, FriendSearchResultDto, ProfilePlaceDto, resolveAvatarUrl } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useUserStore } from '../store/userStore';
import { getPlaceImage } from '../utils/placeImages';

const STATUS_OPTIONS = [
  { id: 'walking', label: 'Готов гулять', color: '#4E8B73' },
  { id: 'transit', label: 'В пути', color: '#B58A4A' },
  { id: 'busy', label: 'Занят', color: '#A86666' },
  { id: 'offline_soon', label: 'Скоро оффлайн', color: '#7E7895' },
];

const AVATAR_BACKGROUNDS = [
  '#D8E7DE',
  '#E7DDD2',
  '#DADCE8',
  '#E6D8DC',
  '#D7E3EA',
  '#E4E1D1',
  '#D9E1D4',
  '#E2D8EA',
];

type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  shadow: string;
  overlay: string;
};

const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#F8F8F6',
    surface: '#FFFFFF',
    surfaceRaised: '#F1F2EF',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    accent: '#355F52',
    accentSoft: '#E8F0EC',
    danger: '#B54D4D',
    shadow: 'rgba(17, 24, 39, 0.07)',
    overlay: 'rgba(11, 13, 15, 0.42)',
  },
  dark: {
    background: '#0B0D0F',
    surface: '#15181C',
    surfaceRaised: '#1B1F24',
    text: '#F8FAFC',
    muted: '#A1A1AA',
    border: '#282D33',
    accent: '#5B9A80',
    accentSoft: '#1B2B25',
    danger: '#D27777',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.68)',
  },
};

function notify(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert(message);
}

function getStatus(status?: string, ready?: boolean) {
  return STATUS_OPTIONS.find((item) => item.id === status) || (ready ? STATUS_OPTIONS[0] : STATUS_OPTIONS[2]);
}

function formatOffline(minutes?: number) {
  const value = minutes || 0;
  if (value < 60) return `${value} мин`;
  return `${Math.floor(value / 60)} ч`;
}

function formatLastWalk(value?: string | null) {
  if (!value) return 'Нет данных';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Нет данных';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function hashString(value?: string) {
  return (value || 'profile').split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function avatarBackground(name?: string) {
  const index = Math.abs(hashString(name)) % AVATAR_BACKGROUNDS.length;
  return AVATAR_BACKGROUNDS[index];
}

function readablePlaceName(place: ProfilePlaceDto) {
  const raw = (place.name || '').trim();
  const technical = !raw || /^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(raw) || raw.toLowerCase().includes('_default');
  if (!technical) return raw;

  const category = (place.category || raw).toLowerCase();
  if (category.includes('public') || raw.includes('public_space')) return 'Общественное пространство';
  if (category.includes('park') || raw.includes('park')) return 'Парк';
  if (category.includes('cafe') || category.includes('coffee') || raw.includes('cafe')) return 'Кафе';
  if (category.includes('restaurant') || category.includes('food')) return 'Ресторан';
  if (category.includes('water') || category.includes('embankment')) return 'Набережная';
  if (category.includes('street')) return 'Улица';
  if (category.includes('square')) return 'Площадь';
  return place.subtitle && !place.subtitle.includes('_') ? place.subtitle : 'Место';
}

function isTechnicalPlaceText(value?: string | null) {
  const text = (value || '').trim();
  return !text || /^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(text) || text.toLowerCase().includes('_default');
}

function placeMetaText(place: ProfilePlaceDto, favorite?: boolean) {
  const subtitle = (place.subtitle || '').trim();
  if (favorite) return isTechnicalPlaceText(subtitle) ? 'Сохранено' : subtitle;
  if (place.visits > 0) return `${place.visits} посещений`;
  return isTechnicalPlaceText(subtitle) ? readablePlaceName(place) : subtitle;
}

export default function UserProfileScreen({ onClose }: { onClose: () => void }) {
  const { width } = useWindowDimensions();
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const palette = PALETTES[theme];
  const styles = useMemo(() => createStyles(palette), [palette]);
  const {
    profile,
    friends,
    incomingRequests,
    isLoadingProfile,
    isLoadingFriends,
    error,
    loadProfile,
    loadFriends,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    toggleWalkReady,
    searchByFriendCode,
    sendRequest,
    acceptRequest,
  } = useUserStore();

  const [statusOpen, setStatusOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [foundUser, setFoundUser] = useState<FriendSearchResultDto | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [placesModal, setPlacesModal] = useState<{ title: string; places: ProfilePlaceDto[]; favorite?: boolean } | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFriends();
  }, []);

  const currentStatus = getStatus(profile?.status, profile?.readyToAirOut);
  const placeCardWidth = Math.min(220, Math.max(164, width * 0.46));

  const copyFriendCode = () => {
    if (!profile?.friendCode) return;
    Clipboard.setString(profile.friendCode);
    notify('Код скопирован');
  };

  const handleCodeSearch = async () => {
    if (!friendCode.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      setFoundUser(await searchByFriendCode(friendCode));
    } catch (e: any) {
      Alert.alert('Не найдено', e.message || 'Пользователь не найден');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async (username: string) => {
    try {
      await sendRequest(username);
      await loadFriends();
      setFoundUser(null);
      setFriendCode('');
      notify('Заявка отправлена');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось добавить друга');
    }
  };

  const openNameEditor = () => {
    setNameDraft(profile?.displayName || profile?.username || '');
    setEditNameOpen(true);
  };

  const saveDisplayName = async () => {
    const displayName = nameDraft.trim();
    if (!displayName) {
      Alert.alert('Имя не может быть пустым');
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfile({ displayName });
      setEditNameOpen(false);
      notify('Имя обновлено');
    } catch (e: any) {
      Alert.alert('Не удалось сохранить имя', e.message);
    } finally {
      setIsSavingName(false);
    }
  };

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ к галерее', 'Разреши доступ к фотографиям в настройках телефона.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      shape: 'oval',
      quality: 0.82,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg', asset.fileName || 'avatar.jpg');
      notify('Фото профиля обновлено');
    } catch (e: any) {
      Alert.alert('Не удалось загрузить фото', e.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const openAvatarActions = () => {
    const actions: any[] = [
      { text: 'Выбрать из галереи', onPress: chooseAvatar },
    ];
    if (profile?.avatarUrl) {
      actions.push({ text: 'Удалить фото', style: 'destructive', onPress: removeAvatar });
    }
    actions.push({ text: 'Отмена', style: 'cancel' });
    Alert.alert('Фото профиля', 'Выбери квадратную область кадрирования', actions);
  };

  if (isLoadingProfile && !profile) {
    return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ flex: 1 }} color={palette.accent} /></SafeAreaView>;
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onBack={onClose} onSettings={() => setSettingsOpen(true)} styles={styles} palette={palette} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Профиль не загрузился</Text>
          <Text style={styles.emptyText} selectable>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Header onBack={onClose} onSettings={() => setSettingsOpen(true)} styles={styles} palette={palette} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <TouchableOpacity onPress={openAvatarActions} activeOpacity={0.86} disabled={isUploadingAvatar}>
            <PhotoAvatar size={172} name={profile?.displayName || profile?.username} uri={profile?.avatarUrl} style={styles.heroAvatar} palette={palette} />
            <View style={styles.editAvatarButton}>
              {isUploadingAvatar ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera-outline" size={19} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
          <View style={styles.heroNameRow}>
            <Text style={styles.heroName} numberOfLines={1}>{profile?.displayName || profile?.username}</Text>
            <TouchableOpacity style={styles.editNameButton} onPress={openNameEditor} activeOpacity={0.76}>
              <Ionicons name="pencil-outline" size={17} color={palette.muted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.codeRow} onPress={copyFriendCode} activeOpacity={0.7}>
            <Text style={styles.codeValue} selectable>{profile?.friendCode || '------'}</Text>
            <Ionicons name="copy-outline" size={18} color={palette.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.statusButton} onPress={() => setStatusOpen(true)} activeOpacity={0.75}>
            <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
            <Text style={styles.statusText}>{currentStatus.label}</Text>
            <Ionicons name="chevron-down" size={17} color={palette.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.visibilityCard}>
          <View style={styles.visibilityIcon}><Ionicons name="eye-outline" size={23} color={palette.accent} /></View>
          <View style={styles.flexOne}>
            <Text style={styles.cardTitle}>Виден на карте</Text>
            <Text style={styles.cardSubtitle}>Друзья могут видеть тебя на карте</Text>
          </View>
          <Switch
            value={!!profile?.geoEnabled}
            onValueChange={(geoEnabled) => updateProfile({ geoEnabled })}
            trackColor={{ false: palette.surfaceRaised, true: palette.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.statsCard}>
          <Stat value={formatOffline(profile?.offlineMinutesWeek)} label="оффлайн за неделю" styles={styles} />
          <View style={styles.statDivider} />
          <Stat value={formatLastWalk(profile?.lastWalkAt)} label="последняя прогулка" styles={styles} />
          <View style={styles.statDivider} />
          <Stat value={`${profile?.recentMeetings?.length || 0}`} label="встречи" styles={styles} />
        </View>

        {incomingRequests.length > 0 && (
          <TouchableOpacity style={styles.requestBanner} activeOpacity={0.84} onPress={() => setFriendsOpen(true)}>
            <View style={styles.requestIcon}><Ionicons name="person-add-outline" size={21} color={palette.accent} /></View>
            <View style={styles.flexOne}>
              <Text style={styles.cardTitle}>Заявка в друзья</Text>
              <Text style={styles.cardSubtitle}>{incomingRequests.length} ожидает ответа</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>
        )}

        <SectionHeader title="Друзья" action="Все" onPress={() => setFriendsOpen(true)} styles={styles} palette={palette} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendRail}>
          {friends.map((friend, index) => <FriendBubble key={`profile-friend-${friend.username}-${index}`} friend={friend} styles={styles} palette={palette} />)}
          <TouchableOpacity style={styles.addFriend} onPress={() => setAddFriendOpen(true)}>
            <View style={styles.addFriendCircle}><Ionicons name="add" size={26} color={palette.muted} /></View>
            <Text style={styles.friendName}>Добавить</Text>
          </TouchableOpacity>
        </ScrollView>

        <PlacesSection title="Часто посещаемые" places={profile?.frequentPlaces || []} cardWidth={placeCardWidth} styles={styles} palette={palette} onOpen={(title, places) => setPlacesModal({ title, places })} />
        <PlacesSection title="Избранное" places={profile?.favoritePlaces || []} cardWidth={placeCardWidth} favorite styles={styles} palette={palette} onOpen={(title, places) => setPlacesModal({ title, places, favorite: true })} />
        <PlacesSection title="Недавние встречи" places={profile?.recentMeetings || []} cardWidth={placeCardWidth} styles={styles} palette={palette} onOpen={(title, places) => setPlacesModal({ title, places })} />
      </ScrollView>

      <Sheet visible={statusOpen} onClose={() => setStatusOpen(false)} styles={styles}>
        <Text style={styles.sheetTitle}>Статус</Text>
        <Text style={styles.sheetSubtitle}>Покажи друзьям, свободен ли ты сейчас</Text>
        {STATUS_OPTIONS.map((status) => (
          <TouchableOpacity
            key={status.id}
            style={[styles.statusOption, currentStatus.id === status.id && styles.statusOptionActive]}
            onPress={async () => { setStatusOpen(false); await toggleWalkReady(status.id); }}
          >
            <View style={[styles.statusDotLarge, { backgroundColor: status.color }]} />
            <Text style={styles.statusOptionText}>{status.label}</Text>
            {currentStatus.id === status.id && <Ionicons name="checkmark" size={20} color={palette.accent} />}
          </TouchableOpacity>
        ))}
      </Sheet>

      <Sheet visible={editNameOpen} onClose={() => setEditNameOpen(false)} styles={styles}>
        <Text style={styles.sheetTitle}>Имя в профиле</Text>
        <Text style={styles.sheetSubtitle}>Так тебя видят друзья</Text>
        <TextInput
          value={nameDraft}
          onChangeText={setNameDraft}
          maxLength={32}
          placeholder="Имя"
          placeholderTextColor={palette.muted}
          style={styles.nameInput}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveDisplayName} disabled={isSavingName}>
          {isSavingName ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Сохранить</Text>}
        </TouchableOpacity>
      </Sheet>

      <FriendsModal
        visible={friendsOpen}
        friends={friends}
        requests={incomingRequests}
        loading={isLoadingFriends}
        onClose={() => setFriendsOpen(false)}
        onAdd={() => setAddFriendOpen(true)}
        onAccept={async (username: string) => { await acceptRequest(username); notify('Заявка принята'); }}
        styles={styles}
        palette={palette}
      />

      <AddFriendModal
        visible={addFriendOpen}
        code={friendCode}
        foundUser={foundUser}
        searching={isSearching}
        onChange={setFriendCode}
        onSearch={handleCodeSearch}
        onAdd={handleAdd}
        onClose={() => setAddFriendOpen(false)}
        styles={styles}
        palette={palette}
      />

      <PlacesModal
        visible={!!placesModal}
        title={placesModal?.title || ''}
        places={placesModal?.places || []}
        favorite={!!placesModal?.favorite}
        onClose={() => setPlacesModal(null)}
        styles={styles}
        palette={palette}
      />

      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <SafeAreaView style={styles.settingsScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.roundButton} onPress={() => setSettingsOpen(false)}><Ionicons name="chevron-back" size={23} color={palette.text} /></TouchableOpacity>
            <Text style={styles.modalTitle}>Настройки</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <SettingsRow icon="moon-outline" title="Тёмная тема" subtitle="Глубокая спокойная палитра" value={theme === 'dark'} onChange={toggleTheme} styles={styles} palette={palette} />
            <SettingsRow icon="eye-outline" title="Виден на карте" subtitle="Друзья могут видеть тебя на карте" value={!!profile?.geoEnabled} onChange={(geoEnabled: boolean) => updateProfile({ geoEnabled })} styles={styles} palette={palette} />
            <TouchableOpacity style={styles.logoutButton} onPress={() => Alert.alert('Выйти из аккаунта?', '', [{ text: 'Отмена', style: 'cancel' }, { text: 'Выйти', style: 'destructive', onPress: logout }])}>
              <Ionicons name="log-out-outline" size={21} color={palette.danger} />
              <Text style={styles.logoutText}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Header({ onBack, onSettings, styles, palette }: any) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.roundButton} onPress={onBack}><Ionicons name="chevron-back" size={25} color={palette.text} /></TouchableOpacity>
      <TouchableOpacity style={styles.roundButton} onPress={onSettings}><Ionicons name="settings-outline" size={23} color={palette.text} /></TouchableOpacity>
    </View>
  );
}

function PhotoAvatar({ size, name, uri, style, palette }: { size: number; name?: string; uri?: string | null; style?: any; palette: Palette }) {
  const resolved = resolveAvatarUrl(uri);
  if (resolved) {
    return <Image source={{ uri: resolved }} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.surfaceRaised }, style]} />;
  }
  return (
    <View style={[stylesForAvatar(size, name), style]}>
      <Text style={{ color: '#111827', fontSize: size * 0.38, fontWeight: '700' }}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function stylesForAvatar(size: number, name?: string) {
  return { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarBackground(name), alignItems: 'center' as const, justifyContent: 'center' as const };
}

function Stat({ value, label, styles }: any) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function SectionHeader({ title, action, onPress, styles, palette }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <TouchableOpacity style={styles.sectionAction} onPress={onPress}><Text style={styles.sectionActionText}>{action}</Text><Ionicons name="chevron-forward" size={16} color={palette.muted} /></TouchableOpacity>}
    </View>
  );
}

function FriendBubble({ friend, styles, palette }: { friend: FriendProfileDto; styles: any; palette: Palette }) {
  const status = getStatus(friend.status, friend.readyToAirOut);
  return (
    <View style={styles.friendBubble}>
      <View>
        <PhotoAvatar size={68} name={friend.displayName || friend.username} uri={friend.avatarUrl} palette={palette} />
        <View style={[styles.friendStatus, { backgroundColor: status.color, borderColor: palette.background }]} />
      </View>
      <Text style={styles.friendName} numberOfLines={1}>{friend.displayName || friend.username}</Text>
    </View>
  );
}

function PlacesSection({ title, places, cardWidth, favorite, styles, palette, onOpen }: { title: string; places: ProfilePlaceDto[]; cardWidth: number; favorite?: boolean; styles: any; palette: Palette; onOpen?: (title: string, places: ProfilePlaceDto[]) => void }) {
  return (
    <View style={styles.placesSection}>
      <SectionHeader title={title} action={places.length ? 'Все' : undefined} onPress={() => onOpen?.(title, places)} styles={styles} palette={palette} />
      {places.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRail} snapToInterval={cardWidth + 12} decelerationRate="fast">
          {places.map((place, index) => (
            <View key={`${title}-${place.id}-${index}`} style={[styles.placeCard, { width: cardWidth }]}>
              <View style={styles.placeImageWrap}>
                <Image source={place.imageUrl ? { uri: place.imageUrl } : getPlaceImage(place.name)} style={styles.placeImage} />
                {favorite && <View style={styles.heart}><Ionicons name="heart" size={17} color="#B95D64" /></View>}
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName} numberOfLines={1}>{readablePlaceName(place)}</Text>
                <Text style={styles.placeMeta} numberOfLines={1}>{placeMetaText(place, favorite)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : <Text style={styles.emptyRail}>Здесь появятся места из твоей оффлайн-жизни</Text>}
    </View>
  );
}

function PlacesModal({ visible, title, places, favorite, onClose, styles, palette }: { visible: boolean; title: string; places: ProfilePlaceDto[]; favorite?: boolean; onClose: () => void; styles: any; palette: Palette }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.settingsScreen}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.roundButton} onPress={onClose}><Ionicons name="chevron-back" size={23} color={palette.text} /></TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {places.map((place, index) => (
            <View key={`all-${title}-${place.id}-${index}`} style={styles.placeListRow}>
              <View style={styles.placeListImageWrap}>
                <Image source={place.imageUrl ? { uri: place.imageUrl } : getPlaceImage(place.name)} style={styles.placeImage} />
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.placeName} numberOfLines={1}>{readablePlaceName(place)}</Text>
                <Text style={styles.placeMeta} numberOfLines={1}>{placeMetaText(place, favorite)}</Text>
              </View>
              {favorite && <Ionicons name="heart" size={18} color="#B95D64" />}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Sheet({ visible, onClose, children, styles }: { visible: boolean; onClose: () => void; children: React.ReactNode; styles: any }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={() => {}}><View style={styles.sheetHandle} />{children}</Pressable></Pressable>
    </Modal>
  );
}

function FriendsModal({ visible, friends, requests, loading, onClose, onAdd, onAccept, styles, palette }: any) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.settingsScreen}>
        <View style={styles.modalHeader}><TouchableOpacity style={styles.roundButton} onPress={onClose}><Ionicons name="chevron-back" size={23} color={palette.text} /></TouchableOpacity><Text style={styles.modalTitle}>Друзья</Text><TouchableOpacity style={styles.roundButton} onPress={onAdd}><Ionicons name="person-add-outline" size={21} color={palette.text} /></TouchableOpacity></View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {requests.length > 0 && <Text style={styles.listLabel}>Заявки</Text>}
          {requests.map((friend: FriendProfileDto, index: number) => <PersonRow key={`request-${friend.username}-${index}`} friend={friend} action="Принять" onPress={() => onAccept(friend.username)} styles={styles} palette={palette} />)}
          <Text style={styles.listLabel}>Все друзья</Text>
          {loading ? <ActivityIndicator color={palette.accent} /> : friends.map((friend: FriendProfileDto, index: number) => <PersonRow key={`friend-${friend.username}-${index}`} friend={friend} styles={styles} palette={palette} />)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AddFriendModal({ visible, code, foundUser, searching, onChange, onSearch, onAdd, onClose, styles, palette }: any) {
  return (
    <Sheet visible={visible} onClose={onClose} styles={styles}>
      <Text style={styles.sheetTitle}>Добавить друга</Text>
      <Text style={styles.sheetSubtitle}>Введи код друга, чтобы отправить заявку</Text>
      <TextInput value={code} onChangeText={(value) => onChange(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} maxLength={6} autoCapitalize="characters" placeholder="XXXXXX" placeholderTextColor={palette.muted} style={styles.codeInput} />
      <TouchableOpacity style={styles.primaryButton} onPress={onSearch} disabled={searching}>{searching ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Найти</Text>}</TouchableOpacity>
      {foundUser && <PersonRow friend={foundUser} action="Добавить" onPress={() => onAdd(foundUser.username)} styles={styles} palette={palette} />}
    </Sheet>
  );
}

function PersonRow({ friend, action, onPress, styles, palette }: any) {
  const status = getStatus(friend.status, friend.readyToAirOut);
  return (
    <View style={styles.personRow}>
      <PhotoAvatar size={52} name={friend.displayName || friend.username} uri={friend.avatarUrl} palette={palette} />
      <View style={styles.flexOne}><Text style={styles.personName}>{friend.displayName || friend.username}</Text><View style={styles.personStatusRow}><View style={[styles.tinyDot, { backgroundColor: status.color }]} /><Text style={styles.personStatus}>{status.label}</Text></View></View>
      {action && <TouchableOpacity style={styles.smallButton} onPress={onPress}><Text style={styles.smallButtonText}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

function SettingsRow({ icon, title, subtitle, value, onChange, styles, palette }: any) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsIcon}><Ionicons name={icon} size={21} color={palette.accent} /></View>
      <View style={styles.flexOne}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardSubtitle}>{subtitle}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: palette.surfaceRaised, true: palette.accent }} thumbColor="#FFFFFF" />
    </View>
  );
}

function createStyles(p: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.background },
    settingsScreen: { flex: 1, backgroundColor: p.background },
    flexOne: { flex: 1 },
    header: { height: 62, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roundButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center', boxShadow: `0 5px 16px ${p.shadow}` },
    headerSpacer: { width: 46 },
    content: { paddingBottom: 48, gap: 16 },
    hero: { alignItems: 'center', paddingTop: 4, paddingHorizontal: 20, paddingBottom: 4 },
    heroAvatar: { borderWidth: 3, borderColor: p.surface },
    editAvatarButton: { position: 'absolute', right: 5, bottom: 5, width: 42, height: 42, borderRadius: 21, backgroundColor: p.accent, borderWidth: 3, borderColor: p.background, alignItems: 'center', justifyContent: 'center' },
    heroNameRow: { maxWidth: '92%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
    heroName: { color: p.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.8, flexShrink: 1 },
    editNameButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
    statusButton: { minHeight: 42, borderRadius: 21, paddingHorizontal: 14, marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { color: p.text, fontSize: 16, fontWeight: '600' },
    codeRow: { minHeight: 36, borderRadius: 18, paddingHorizontal: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    codeLabel: { color: p.muted, fontSize: 14, fontWeight: '500' },
    codeValue: { color: p.text, fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: 1.1 },
    visibilityCard: { marginHorizontal: 18, minHeight: 88, borderRadius: 22, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: `0 8px 22px ${p.shadow}` },
    visibilityIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { color: p.text, fontSize: 15, fontWeight: '700' },
    cardSubtitle: { color: p.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
    statsCard: { marginHorizontal: 18, minHeight: 104, borderRadius: 22, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, boxShadow: `0 8px 22px ${p.shadow}` },
    stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    statValue: { color: p.text, fontSize: 18, lineHeight: 24, height: 24, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center', maxWidth: 92 },
    statLabel: { color: p.muted, fontSize: 11, lineHeight: 15, height: 32, width: 86, textAlign: 'center', marginTop: 6 },
    statDivider: { width: 1, height: 54, backgroundColor: p.border },
    requestBanner: { marginHorizontal: 18, minHeight: 76, borderRadius: 22, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: `0 8px 22px ${p.shadow}` },
    requestIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    sectionHeader: { paddingHorizontal: 18, minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: p.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    sectionActionText: { color: p.muted, fontSize: 14, fontWeight: '600' },
    friendRail: { paddingHorizontal: 18, gap: 16 },
    friendBubble: { width: 70, alignItems: 'center', gap: 7 },
    friendStatus: { position: 'absolute', right: 0, bottom: 1, width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
    friendName: { maxWidth: 72, color: p.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    addFriend: { width: 72, alignItems: 'center', gap: 7 },
    addFriendCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, borderStyle: 'dashed', borderColor: p.border, alignItems: 'center', justifyContent: 'center' },
    placesSection: { gap: 10 },
    placeRail: { paddingHorizontal: 18, paddingBottom: 8, gap: 12 },
    placeCard: { borderRadius: 19, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden', boxShadow: `0 8px 20px ${p.shadow}` },
    placeImageWrap: { height: 132, backgroundColor: p.surfaceRaised },
    placeImage: { width: '100%', height: '100%' },
    heart: { position: 'absolute', right: 10, top: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' },
    placeInfo: { paddingHorizontal: 13, paddingVertical: 12 },
    placeName: { color: p.text, fontSize: 15, fontWeight: '700' },
    placeMeta: { color: p.muted, fontSize: 12, marginTop: 4 },
    placeListRow: { minHeight: 82, borderRadius: 20, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
    placeListImageWrap: { width: 62, height: 62, borderRadius: 16, overflow: 'hidden', backgroundColor: p.surfaceRaised },
    emptyRail: { color: p.muted, fontSize: 13, marginHorizontal: 18, padding: 18, borderRadius: 18, backgroundColor: p.surface },
    emptyState: { margin: 18, padding: 24, borderRadius: 22, backgroundColor: p.surface, alignItems: 'center', gap: 8 },
    emptyTitle: { color: p.text, fontSize: 18, fontWeight: '800' },
    emptyText: { color: p.muted, fontSize: 13, textAlign: 'center' },
    backdrop: { flex: 1, backgroundColor: p.overlay, justifyContent: 'flex-end' },
    sheet: { backgroundColor: p.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 38 : 24, gap: 10 },
    sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: p.border, marginBottom: 8 },
    sheetTitle: { color: p.text, fontSize: 22, fontWeight: '800' },
    sheetSubtitle: { color: p.muted, fontSize: 13, marginBottom: 6 },
    statusOption: { minHeight: 54, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusOptionActive: { backgroundColor: p.accentSoft },
    statusDotLarge: { width: 11, height: 11, borderRadius: 6 },
    statusOptionText: { flex: 1, color: p.text, fontSize: 15, fontWeight: '600' },
    modalHeader: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { color: p.text, fontSize: 19, fontWeight: '800' },
    modalContent: { padding: 18, paddingBottom: 40, gap: 10 },
    listLabel: { color: p.muted, fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 2 },
    personRow: { minHeight: 72, borderRadius: 20, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
    personName: { color: p.text, fontSize: 15, fontWeight: '700' },
    personStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    tinyDot: { width: 7, height: 7, borderRadius: 4 },
    personStatus: { color: p.muted, fontSize: 11 },
    smallButton: { minHeight: 34, borderRadius: 17, backgroundColor: p.accentSoft, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
    smallButtonText: { color: p.accent, fontSize: 12, fontWeight: '700' },
    codeInput: { height: 60, borderRadius: 18, backgroundColor: p.surfaceRaised, color: p.text, fontSize: 25, fontWeight: '800', textAlign: 'center', letterSpacing: 8, borderWidth: 1, borderColor: p.border },
    nameInput: { height: 54, borderRadius: 18, backgroundColor: p.surfaceRaised, color: p.text, fontSize: 18, fontWeight: '700', paddingHorizontal: 16, borderWidth: 1, borderColor: p.border },
    primaryButton: { height: 52, borderRadius: 18, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    settingsContent: { padding: 18, gap: 12 },
    settingsRow: { minHeight: 78, borderRadius: 20, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingsIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    logoutButton: { height: 56, borderRadius: 18, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    logoutText: { color: p.danger, fontSize: 14, fontWeight: '700' },
  });
}
