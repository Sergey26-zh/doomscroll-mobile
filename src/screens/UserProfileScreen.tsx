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
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DiceBearAvatar, {
  AvatarConfig,
  avatarConfigToSeed,
  avatarSeedToConfig,
} from '../components/DiceBearAvatar';
import { FriendProfileDto, FriendSearchResultDto, ProfilePlaceDto } from '../api/users';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { getPlaceImage } from '../utils/placeImages';

const FONT = Platform.select({ ios: 'Manrope', android: 'Manrope', default: undefined });
const BG = '#F8F8FA';
const SURFACE = '#FFFFFF';
const TEXT = '#111827';
const MUTED = '#7A8192';
const SOFT = '#F2F4F7';
const BORDER = '#ECEEF3';
const ACCENT = '#10B981';
const PURPLE = '#8B5CF6';

const STATUS_OPTIONS = [
  { id: 'walking', label: 'Готов гулять', color: '#10B981' },
  { id: 'transit', label: 'В пути', color: '#F59E0B' },
  { id: 'busy', label: 'Занят', color: '#EF4444' },
  { id: 'offline_soon', label: 'Скоро оффлайн', color: '#8B5CF6' },
];

const HAIR_OPTIONS = [
  'shortFlat',
  'shortCurly',
  'shortRound',
  'theCaesar',
  'theCaesarAndSidePart',
  'dreads01',
  'dreads02',
  'frizzle',
  'shaggyMullet',
  'straight01',
  'straight02',
  'bob',
].map((id) => ({ id, label: id }));

const FACE_OPTIONS = [
  { id: 'alex', label: 'Alex', baseSeed: 'alex', top: 'shortCurly', eyes: 'default', mouth: 'smile', skinColor: 'ae5d29', hairColor: '2c1b18' },
  { id: 'max', label: 'Max', baseSeed: 'max', top: 'theCaesar', eyes: 'happy', mouth: 'twinkle', skinColor: 'd08b5b', hairColor: '724133' },
  { id: 'anna', label: 'Anna', baseSeed: 'anna', top: 'straight02', eyes: 'default', mouth: 'smile', skinColor: '614335', hairColor: 'a55728' },
  { id: 'mila', label: 'Mila', baseSeed: 'mila', top: 'bob', eyes: 'squint', mouth: 'smile', skinColor: 'f8d25c', hairColor: '2c1b18' },
  { id: 'vlad', label: 'Vlad', baseSeed: 'vlad', top: 'shortRound', eyes: 'surprised', mouth: 'serious', skinColor: 'edb98a', hairColor: '4a312c' },
  { id: 'dash', label: 'Dash', baseSeed: 'dash', top: 'dreads01', eyes: 'happy', mouth: 'twinkle', skinColor: '8d5524', hairColor: '2c1b18' },
];

const EYE_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'happy', label: 'Happy' },
  { id: 'squint', label: 'Squint' },
  { id: 'surprised', label: 'Wide' },
  { id: 'wink', label: 'Wink' },
  { id: 'hearts', label: 'Hearts' },
];

const MOUTH_OPTIONS = [
  { id: 'smile', label: 'Smile' },
  { id: 'twinkle', label: 'Happy' },
  { id: 'serious', label: 'Calm' },
  { id: 'default', label: 'Soft' },
  { id: 'concerned', label: 'Kind' },
  { id: 'disbelief', label: 'Look' },
  { id: 'eating', label: 'Eat' },
  { id: 'grimace', label: 'Wide' },
];

const ACCESSORY_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'prescription01', label: 'Glasses' },
  { id: 'prescription02', label: 'Thin' },
  { id: 'round', label: 'Round' },
  { id: 'kurt', label: 'Shades' },
  { id: 'wayfarers', label: 'Bold' },
];

const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'f8d25c', 'ecdcbf'];
const CLOTHES_COLORS = ['6C63FF', '10B981', '65C9FF', 'FF5C5C', 'F59E0B', '111827', 'FFFFFF', '7C3AED'];
const BACKGROUND_COLORS = ['E9D5FF', 'D1F4E5', 'FFE4C7', 'DCE8FF', 'FCE7F3', 'E0F2FE'];
const SKIN_COLORS = ['614335', '8d5524', 'ae5d29', 'd08b5b', 'edb98a', 'ffdbb4', 'f8d25c'];

function notify(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

function getStatus(status?: string, ready?: boolean) {
  return STATUS_OPTIONS.find((item) => item.id === status) || (ready ? STATUS_OPTIONS[0] : STATUS_OPTIONS[2]);
}

function formatMinutes(minutes?: number) {
  const total = minutes || 0;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours <= 0) return `${rest} мин`;
  return `${hours} ч ${rest} мин`;
}

function formatLastWalk(value?: string | null) {
  if (!value) return 'пока нет';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'пока нет';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) return `сегодня в ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `вчера в ${time}`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function categoryIcon(category?: string | null) {
  const value = (category || '').toLowerCase();
  if (value.includes('coffee') || value.includes('cafe') || value.includes('каф')) return 'cafe-outline';
  if (value.includes('park') || value.includes('парк')) return 'leaf-outline';
  if (value.includes('book') || value.includes('книг')) return 'book-outline';
  if (value.includes('food') || value.includes('restaurant') || value.includes('еда')) return 'restaurant-outline';
  return 'location-outline';
}

export default function UserProfileScreen({ onClose }: { onClose: () => void }) {
  const { logout } = useAuthStore();
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
    toggleWalkReady,
    searchByFriendCode,
    searchFriendSuggestions,
    sendRequest,
    acceptRequest,
  } = useUserStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [friendNameQuery, setFriendNameQuery] = useState('');
  const [foundUser, setFoundUser] = useState<FriendSearchResultDto | null>(null);
  const [suggestions, setSuggestions] = useState<FriendSearchResultDto[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => avatarSeedToConfig(null));
  const [avatarTab, setAvatarTab] = useState<'hair' | 'face' | 'eyes' | 'mouth' | 'accessories' | 'clothes' | 'bg'>('hair');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFriends();
  }, []);

  useEffect(() => {
    setAvatarConfig(avatarSeedToConfig(profile?.avatarSeed, profile?.username));
  }, [profile?.avatarSeed, profile?.username]);

  useEffect(() => {
    if (!friendsOpen) return;
    const timer = setTimeout(async () => {
      try {
        setSuggestions(await searchFriendSuggestions(friendNameQuery));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [friendNameQuery, friendsOpen]);

  const selectedAvatarSeed = useMemo(() => avatarConfigToSeed(avatarConfig), [avatarConfig]);
  const avatarDirty = selectedAvatarSeed !== (profile?.avatarSeed || '');
  const currentStatus = getStatus(profile?.status, profile?.readyToAirOut);
  const gradientClothes = `#${avatarConfig.clothesColor || '6C63FF'}`;
  const gradientBackground = `#${avatarConfig.backgroundColor || 'D1F4E5'}`;
  const friendsNearby = friends.filter((friend) => ['walking', 'transit'].includes(friend.status)).length;
  const filteredFriends = friends.filter((friend) => {
    const query = friendNameQuery.trim().toLowerCase();
    if (!query) return true;
    return (friend.displayName || friend.username).toLowerCase().includes(query);
  });

  const copyFriendCode = () => {
    if (!profile?.friendCode) return;
    Clipboard.setString(profile.friendCode);
    notify('Код друга скопирован');
  };

  const closeAvatarEditor = () => {
    if (!avatarDirty) {
      setAvatarOpen(false);
      return;
    }
    Alert.alert('Сохранить изменения?', 'Вы изменили аватар. Сохранить перед выходом?', [
      { text: 'Не сохранять', style: 'destructive', onPress: () => {
        setAvatarConfig(avatarSeedToConfig(profile?.avatarSeed, profile?.username));
        setAvatarOpen(false);
      } },
      { text: 'Отмена', style: 'cancel' },
      { text: 'Сохранить', onPress: saveAvatar },
    ]);
  };

  const saveAvatar = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ avatarSeed: selectedAvatarSeed });
      notify('Аватар сохранён');
      setAvatarOpen(false);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось сохранить аватар');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeSearch = async () => {
    if (!friendCodeInput.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      setFoundUser(await searchByFriendCode(friendCodeInput));
    } catch (e: any) {
      Alert.alert('Не найдено', e.message || 'Пользователь не найден');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    try {
      await sendRequest(username);
      await loadFriends();
      setFoundUser(null);
      setFriendCodeInput('');
      notify('Заявка отправлена');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось добавить друга');
    }
  };

  const handleAcceptRequest = async (username: string) => {
    try {
      await acceptRequest(username);
      notify('Заявка принята');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось принять заявку');
    }
  };

  const handleLogout = () => {
    Alert.alert('Выйти из аккаунта?', 'Вы выйдете из аккаунта на этом устройстве.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);
  };

  const handleStatusChange = async (status: string) => {
    setStatusOpen(false);
    await toggleWalkReady(status);
  };

  if (isLoadingProfile && !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <TopBar title="Профиль" left={<IconButton icon="chevron-back" onPress={onClose} />} />
        <View style={styles.centerBox}>
          <Text style={styles.title}>Профиль не загрузился</Text>
          <Text style={styles.muted} selectable>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${gradientBackground}00`, `${gradientClothes}1F`, `${gradientBackground}2B`, `${gradientBackground}10`, `${BG}00`]}
        locations={[0, 0.22, 0.55, 0.82, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGradient}
      />
      <TopBar
        title="Профиль"
        left={<IconButton icon="chevron-back" onPress={onClose} />}
        right={<IconButton icon="settings-outline" onPress={() => setSettingsOpen(true)} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.sparkleOne} />
          <View style={styles.sparkleTwo} />
          <View style={styles.avatarWrap}>
            <DiceBearAvatar seed={profile?.avatarSeed} size={112} style={styles.heroAvatar} />
            <View style={[styles.avatarOnlineDot, { backgroundColor: currentStatus.color }]} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={1} adjustsFontSizeToFit>{profile?.displayName || profile?.username}</Text>
            <TouchableOpacity style={styles.codeLine} onPress={copyFriendCode}>
              <Text style={styles.codeText} selectable>{profile?.friendCode || '------'}</Text>
              <Ionicons name="copy-outline" size={20} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.statusLine} onPress={() => setStatusOpen(true)} activeOpacity={0.82}>
              <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
              <Text style={[styles.statusText, { color: currentStatus.color }]} numberOfLines={1}>{currentStatus.label}</Text>
              <Ionicons name="chevron-down" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsCard}>
          <StatCell icon="timer-outline" tint="#14B8A6" label="Оффлайн за неделю" value={formatMinutes(profile?.offlineMinutesWeek)} />
          <StatCell icon="moon-outline" tint="#8B5CF6" label="Последняя прогулка" value={formatLastWalk(profile?.lastWalkAt)} />
          <StatCell icon="flame-outline" tint="#F59E0B" label="Серия" value={`${profile?.streakDays || 0} дня подряд`} />
        </View>

        <TouchableOpacity style={styles.blockCard} activeOpacity={0.9} onPress={() => setFriendsOpen(true)}>
          <View style={styles.sectionTop}>
            <Text style={styles.sectionTitle}>Друзья</Text>
            <View style={styles.row}>
              <Text style={styles.sectionMeta}>{profile?.friendsCount ?? friends.length} друга · {friendsNearby} рядом</Text>
              <Ionicons name="chevron-forward" size={20} color={MUTED} />
            </View>
          </View>
          <View style={styles.friendPreviewRow}>
            {friends.slice(0, 3).map((friend) => <FriendBubble key={friend.username} friend={friend} />)}
            <TouchableOpacity style={styles.addBubble} onPress={() => setAddFriendOpen(true)}>
              <Ionicons name="add" size={28} color={MUTED} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addFriendButton} onPress={() => setAddFriendOpen(true)}>
              <Ionicons name="person-add-outline" size={20} color={ACCENT} />
              <Text style={styles.addFriendText}>Добавить друга</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <PlacesSection title="Последние встречи" places={profile?.recentMeetings || []} compact />
        <PlacesSection title="Любимые места" places={profile?.favoritePlaces || []} />

        <View style={styles.visibilityCard}>
          <View style={styles.softIcon}>
            <Ionicons name="location-outline" size={28} color={ACCENT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionKicker}>Настройки видимости</Text>
            <Text style={styles.actionTitle}>Показывать меня на карте</Text>
            <Text style={styles.actionSub}>Друзья видят вас на карте, пока гео включено.</Text>
          </View>
          <Switch
            value={!!profile?.geoEnabled}
            onValueChange={(geoEnabled) => updateProfile({ geoEnabled })}
            trackColor={{ false: '#DFE3EA', true: '#9AE6C9' }}
            thumbColor={profile?.geoEnabled ? ACCENT : '#FFFFFF'}
          />
        </View>
      </ScrollView>

      <FriendsModal
        visible={friendsOpen}
        friends={filteredFriends}
        requests={incomingRequests}
        suggestions={suggestions}
        query={friendNameQuery}
        loading={isLoadingFriends}
        onQueryChange={setFriendNameQuery}
        onClose={() => setFriendsOpen(false)}
        onAccept={handleAcceptRequest}
        onAdd={handleSendRequest}
        onOpenAddByCode={() => setAddFriendOpen(true)}
      />

      <AddFriendModal
        visible={addFriendOpen}
        code={friendCodeInput}
        foundUser={foundUser}
        isSearching={isSearching}
        profileSeed={profile?.avatarSeed}
        profileName={profile?.displayName || profile?.username || ''}
        profileCode={profile?.friendCode || '------'}
        onChangeCode={(value) => setFriendCodeInput(value.toUpperCase())}
        onSearch={handleCodeSearch}
        onAdd={handleSendRequest}
        onCopy={copyFriendCode}
        onClose={() => setAddFriendOpen(false)}
      />

      <StatusModal
        visible={statusOpen}
        currentStatus={currentStatus.id}
        onClose={() => setStatusOpen(false)}
        onSelect={handleStatusChange}
      />

      <SettingsModal
        visible={settingsOpen}
        profileName={profile?.displayName || profile?.username || ''}
        friendCode={profile?.friendCode || '------'}
        geoEnabled={!!profile?.geoEnabled}
        onClose={() => setSettingsOpen(false)}
        onAvatar={() => setAvatarOpen(true)}
        onCopyCode={copyFriendCode}
        onGeoChange={(geoEnabled) => updateProfile({ geoEnabled })}
        onLogout={handleLogout}
      />

      <AvatarEditor
        visible={avatarOpen}
        config={avatarConfig}
        activeTab={avatarTab}
        seed={selectedAvatarSeed}
        dirty={avatarDirty}
        saving={isSaving}
        onChange={setAvatarConfig}
        onTabChange={setAvatarTab}
        onSave={saveAvatar}
        onClose={closeAvatarEditor}
      />
    </SafeAreaView>
  );
}

function TopBar({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.topBar}>
      {left || <View style={{ width: 52 }} />}
      <Text style={styles.topTitle}>{title}</Text>
      {right || <View style={{ width: 52 }} />}
    </View>
  );
}

function IconButton({ icon, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.iconButton, danger && styles.iconButtonDanger]} onPress={onPress} activeOpacity={0.82}>
      <Ionicons name={icon} size={25} color={danger ? '#DC2626' : TEXT} />
    </TouchableOpacity>
  );
}

function StatCell({ icon, tint, label, value }: { icon: keyof typeof Ionicons.glyphMap; tint: string; label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}16` }]}>
        <Ionicons name={icon} size={24} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
        <Text style={styles.statValue} numberOfLines={2} adjustsFontSizeToFit>{value}</Text>
      </View>
    </View>
  );
}

function FriendBubble({ friend }: { friend: FriendProfileDto }) {
  const status = getStatus(friend.status, friend.readyToAirOut);
  return (
    <View style={styles.friendBubble}>
      <View>
        <DiceBearAvatar seed={friend.avatarSeed || friend.username} size={62} />
        <View style={[styles.smallDot, { backgroundColor: status.color }]} />
      </View>
      <Text style={styles.friendBubbleName} numberOfLines={1}>{friend.displayName || friend.username}</Text>
      <Text style={styles.friendBubbleSub}>сейчас не рядом</Text>
    </View>
  );
}

function PlacesSection({ title, places, compact, onOpen }: { title: string; places: ProfilePlaceDto[]; compact?: boolean; onOpen?: () => void }) {
  const [localOpen, setLocalOpen] = useState(false);
  if (!places.length) return null;
  return (
    <>
    <View style={styles.blockCard}>
      <TouchableOpacity style={styles.placesOpenHitbox} onPress={onOpen || (() => setLocalOpen(true))} activeOpacity={0.75} />
      <View style={styles.sectionTop}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.row}>
          <Text style={styles.sectionMeta}>Все</Text>
          <Ionicons name="chevron-forward" size={20} color={MUTED} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeRail}>
        {places.map((place, index) => (
          <View key={`${title}-${place.id}-${place.subtitle}-${index}`} style={compact ? styles.meetingCard : styles.placeCard}>
            <View style={compact ? styles.meetingImageBox : styles.placeImageBox}>
              <Image source={getPlaceImage(place.name)} style={styles.placeImage} />
              <View style={styles.placeBadge}>
                <Ionicons name={categoryIcon(place.category)} size={18} color={ACCENT} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
              <Text style={styles.placeSub} numberOfLines={compact ? 2 : 1}>{compact ? place.subtitle : `${place.visits} посещений`}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
    <PlacesModal visible={localOpen} title={title} places={places} onClose={() => setLocalOpen(false)} />
    </>
  );
}

function PlacesModal({ visible, title, places, onClose }: { visible: boolean; title: string; places: ProfilePlaceDto[]; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <TopBar title={title} left={<IconButton icon="close-outline" onPress={onClose} />} />
        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {places.map((place, index) => (
            <View key={`place-modal-${place.id}-${place.subtitle}-${index}`} style={styles.placeListRow}>
              <View style={styles.placeListImageBox}>
                <Image source={getPlaceImage(place.name)} style={styles.placeImage} />
                <View style={styles.placeBadge}>
                  <Ionicons name={categoryIcon(place.category)} size={18} color={ACCENT} />
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.rowSub} numberOfLines={2}>{place.subtitle || `${place.visits} посещений`}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function FriendsModal({
  visible,
  friends,
  requests,
  suggestions,
  query,
  loading,
  onQueryChange,
  onClose,
  onAccept,
  onAdd,
  onOpenAddByCode,
}: {
  visible: boolean;
  friends: FriendProfileDto[];
  requests: FriendProfileDto[];
  suggestions: FriendSearchResultDto[];
  query: string;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onAccept: (username: string) => void;
  onAdd: (username: string) => void;
  onOpenAddByCode: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <TopBar title="Друзья" left={<IconButton icon="close-outline" onPress={onClose} />} right={<IconButton icon="add" onPress={onOpenAddByCode} />} />
        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={MUTED} />
            <TextInput style={styles.searchInput} placeholder="Поиск друга по имени" placeholderTextColor={MUTED} value={query} onChangeText={onQueryChange} />
          </View>

          {!!requests.length && (
            <View style={styles.listSection}>
              <Text style={styles.listTitle}>Запросы <Text style={styles.countBadge}>{requests.length}</Text></Text>
              {requests.map((item) => <RequestRow key={item.username} friend={item} onAccept={() => onAccept(item.username)} />)}
            </View>
          )}

          <View style={styles.listSection}>
            <View style={styles.sectionTop}>
              <Text style={styles.listTitle}>Друзья</Text>
              <Text style={styles.sectionMeta}>{friends.length} друга · 0 рядом</Text>
            </View>
            {loading ? <ActivityIndicator color={ACCENT} /> : friends.map((item) => <FriendRow key={item.username} friend={item} />)}
            {!loading && friends.length === 0 && <Text style={styles.emptyText}>Ничего не найдено.</Text>}
          </View>

          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Возможно, вы знаете <Text style={styles.countBadge}>{suggestions.length}</Text></Text>
            {suggestions.map((item) => <SuggestionRow key={item.username} user={item} onAdd={() => onAdd(item.username)} />)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AddFriendModal(props: {
  visible: boolean;
  code: string;
  foundUser: FriendSearchResultDto | null;
  isSearching: boolean;
  profileSeed?: string | null;
  profileName: string;
  profileCode: string;
  onChangeCode: (value: string) => void;
  onSearch: () => void;
  onAdd: (username: string) => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.screen}>
        <TopBar title="Добавить друга" left={<IconButton icon="close-outline" onPress={props.onClose} />} />
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.centerHint}>Введите код друга или поделитесь своим</Text>
          <TextInput
            style={styles.bigCodeInput}
            placeholder="974B5E"
            placeholderTextColor="#A1A8B8"
            autoCapitalize="characters"
            maxLength={8}
            value={props.code}
            onChangeText={props.onChangeCode}
          />
          <TouchableOpacity style={styles.primaryWide} onPress={props.onSearch} disabled={props.isSearching}>
            {props.isSearching ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryWideText}>Найти по коду</Text>}
          </TouchableOpacity>
          {props.foundUser && (
            <SuggestionRow user={props.foundUser} onAdd={() => props.onAdd(props.foundUser!.username)} />
          )}
          <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>или</Text><View style={styles.divider} /></View>
          <LinearGradient colors={['#E8FFF5', '#F2F6FF']} style={styles.myCodeCard}>
            <Text style={styles.myCodeTitle}>Ваш код</Text>
            <DiceBearAvatar seed={props.profileSeed} size={78} />
            <Text style={styles.myCodeName}>{props.profileName}</Text>
            <Text style={styles.myCodeValue}>{props.profileCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={props.onCopy}>
              <Ionicons name="copy-outline" size={18} color={ACCENT} />
              <Text style={styles.shareButtonText}>Скопировать</Text>
            </TouchableOpacity>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StatusModal({ visible, currentStatus, onClose, onSelect }: { visible: boolean; currentStatus: string; onClose: () => void; onSelect: (status: string) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.statusSheet} onPress={() => {}}>
          <Text style={styles.statusSheetTitle}>Статус</Text>
          {STATUS_OPTIONS.map((status) => {
            const active = currentStatus === status.id;
            return (
              <TouchableOpacity key={status.id} style={[styles.statusOptionRow, active && styles.statusOptionRowActive]} onPress={() => onSelect(status.id)}>
                <View style={[styles.statusDotLarge, { backgroundColor: status.color }]} />
                <Text style={styles.statusOptionLabel}>{status.label}</Text>
                {active && <Ionicons name="checkmark" size={20} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SettingsModal(props: {
  visible: boolean;
  profileName: string;
  friendCode: string;
  geoEnabled: boolean;
  onClose: () => void;
  onAvatar: () => void;
  onCopyCode: () => void;
  onGeoChange: (value: boolean) => void;
  onLogout: () => void;
}) {
  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.screen}>
        <TopBar title="Настройки" left={<IconButton icon="close-outline" onPress={props.onClose} />} />
        <ScrollView contentContainerStyle={styles.modalContent}>
          <SettingsGroup title="Профиль">
            <SettingsRow icon="person-outline" tint={ACCENT} title="Имя" subtitle={props.profileName} />
            <SettingsRow icon="happy-outline" tint={PURPLE} title="Аватар" subtitle="Настроить образ" onPress={props.onAvatar} />
            <SettingsRow icon="shield-checkmark-outline" tint={ACCENT} title="Код друга" subtitle={props.friendCode} onPress={props.onCopyCode} copy />
          </SettingsGroup>
          <SettingsGroup title="Приватность">
            <SettingsRow icon="location-outline" tint={ACCENT} title="Показывать меня на карте" subtitle="Друзья смогут видеть вашу активность и местоположение." switchValue={props.geoEnabled} onSwitch={props.onGeoChange} />
            <SettingsRow icon="eye-outline" tint={PURPLE} title="Видимость активности" subtitle="Все друзья" />
          </SettingsGroup>
          <SettingsGroup title="Уведомления">
            <SettingsRow icon="notifications-outline" tint="#F59E0B" title="Уведомления" subtitle="Включены" />
            <SettingsRow icon="volume-high-outline" tint="#3B82F6" title="Звуки" subtitle="Включены" />
            <SettingsRow icon="moon-outline" tint={PURPLE} title="Не беспокоить" subtitle="Выключено" />
          </SettingsGroup>
          <SettingsGroup title="Приложение">
            <SettingsRow icon="color-palette-outline" tint="#3B82F6" title="Тема" subtitle="Светлая" />
            <SettingsRow icon="information-circle-outline" tint="#6B7280" title="О приложении" subtitle="Версия 1.2.0" />
          </SettingsGroup>
          <TouchableOpacity style={styles.logoutCard} onPress={props.onLogout}>
            <Ionicons name="log-out-outline" size={26} color="#DC2626" />
            <View>
              <Text style={styles.logoutTitle}>Выйти из аккаунта</Text>
              <Text style={styles.logoutSub}>Вы выйдете из аккаунта на этом устройстве</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AvatarEditor(props: {
  visible: boolean;
  config: AvatarConfig;
  activeTab: 'hair' | 'face' | 'eyes' | 'mouth' | 'accessories' | 'clothes' | 'bg';
  seed: string;
  dirty: boolean;
  saving: boolean;
  onChange: (config: AvatarConfig) => void;
  onTabChange: (tab: 'hair' | 'face' | 'eyes' | 'mouth' | 'accessories' | 'clothes' | 'bg') => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const tabs = [
    { id: 'hair', icon: 'cut-outline', label: 'Прическа' },
    { id: 'face', icon: 'happy-outline', label: 'Лицо' },
    { id: 'eyes', icon: 'eye-outline', label: 'Глаза' },
    { id: 'mouth', icon: 'chatbubble-ellipses-outline', label: 'Рот' },
    { id: 'accessories', icon: 'glasses-outline', label: 'Очки' },
    { id: 'clothes', icon: 'shirt-outline', label: 'Одежда' },
    { id: 'bg', icon: 'ellipse-outline', label: 'Фон' },
  ] as const;

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaView style={styles.avatarScreen}>
        <TopBar
          title="Создать аватар"
          left={<IconButton icon="chevron-back" onPress={props.onClose} />}
          right={<TouchableOpacity onPress={props.onSave} disabled={props.saving || !props.dirty}><Text style={styles.saveLink}>{props.saving ? '...' : 'Сохранить'}</Text></TouchableOpacity>}
        />
        <ScrollView contentContainerStyle={styles.avatarContent}>
          <DiceBearAvatar seed={props.seed} size={154} style={styles.editorAvatar} />
          <View style={styles.avatarTabs}>
            {tabs.map((tab) => {
              const active = props.activeTab === tab.id;
              return (
                <TouchableOpacity key={tab.id} style={[styles.avatarTab, active && styles.avatarTabActive]} onPress={() => props.onTabChange(tab.id)}>
                  <Ionicons name={tab.icon} size={19} color={active ? PURPLE : MUTED} />
                  <Text style={[styles.avatarTabText, active && styles.avatarTabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {props.activeTab === 'hair' && <AvatarGrid config={props.config} options={HAIR_OPTIONS} field="top" onChange={props.onChange} />}
          {props.activeTab === 'face' && <FaceGrid config={props.config} onChange={props.onChange} />}
          {props.activeTab === 'eyes' && <AvatarGrid config={props.config} options={EYE_OPTIONS} field="eyes" onChange={props.onChange} />}
          {props.activeTab === 'mouth' && <AvatarGrid config={props.config} options={MOUTH_OPTIONS} field="mouth" onChange={props.onChange} />}
          {props.activeTab === 'accessories' && <AvatarGrid config={props.config} options={ACCESSORY_OPTIONS} field="accessories" onChange={props.onChange} />}
          {props.activeTab === 'clothes' && <ColorGrid colors={CLOTHES_COLORS} value={props.config.clothesColor} onChange={(clothesColor) => props.onChange({ ...props.config, clothesColor })} />}
          {props.activeTab === 'bg' && <ColorGrid colors={BACKGROUND_COLORS} value={props.config.backgroundColor} onChange={(backgroundColor) => props.onChange({ ...props.config, backgroundColor })} />}
          {props.activeTab === 'face' && (
            <ColorGrid colors={SKIN_COLORS} value={props.config.skinColor} onChange={(skinColor) => props.onChange({ ...props.config, skinColor })} />
          )}
          {props.activeTab === 'hair' && (
            <ColorGrid colors={HAIR_COLORS} value={props.config.hairColor} onChange={(hairColor) => props.onChange({ ...props.config, hairColor })} />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function AvatarGrid({ config, options, field, onChange }: { config: AvatarConfig; options: { id: string; label: string }[]; field: keyof AvatarConfig; onChange: (config: AvatarConfig) => void }) {
  return (
    <View style={styles.avatarGrid}>
      {options.map((option) => {
        const next = { ...config, [field]: option.id };
        const active = config[field] === option.id;
        return (
          <TouchableOpacity key={option.id} style={[styles.avatarOption, active && styles.avatarOptionActive]} onPress={() => onChange(next)}>
            <DiceBearAvatar seed={avatarConfigToSeed(next)} size={48} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FaceGrid({ config, onChange }: { config: AvatarConfig; onChange: (config: AvatarConfig) => void }) {
  return (
    <View style={styles.avatarGrid}>
      {FACE_OPTIONS.map((option) => {
        const next = {
          ...config,
          baseSeed: option.baseSeed,
          top: option.top,
          eyes: option.eyes,
          mouth: option.mouth,
          skinColor: option.skinColor,
          hairColor: option.hairColor,
        };
        const active = config.baseSeed === option.baseSeed;
        return (
          <TouchableOpacity key={option.id} style={[styles.avatarOption, active && styles.avatarOptionActive]} onPress={() => onChange(next)}>
            <DiceBearAvatar seed={avatarConfigToSeed(next)} size={48} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ColorGrid({ colors, value, onChange }: { colors: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.colorGrid}>
      {colors.map((color) => (
        <TouchableOpacity key={color} style={[styles.roundSwatch, { backgroundColor: `#${color}` }, value.toLowerCase() === color.toLowerCase() && styles.roundSwatchActive]} onPress={() => onChange(color)} />
      ))}
    </View>
  );
}

function FriendRow({ friend }: { friend: FriendProfileDto }) {
  return (
    <View style={styles.listRow}>
      <DiceBearAvatar seed={friend.avatarSeed || friend.username} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{friend.displayName || friend.username}</Text>
        <Text style={styles.rowSub}>сейчас не рядом</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={MUTED} />
    </View>
  );
}

function RequestRow({ friend, onAccept }: { friend: FriendProfileDto; onAccept: () => void }) {
  return (
    <View style={styles.requestRow}>
      <DiceBearAvatar seed={friend.avatarSeed || friend.username} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{friend.displayName || friend.username}</Text>
        <Text style={styles.rowSub}>Хочет добавить вас в друзья</Text>
      </View>
      <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}><Text style={styles.acceptText}>Принять</Text></TouchableOpacity>
    </View>
  );
}

function SuggestionRow({ user, onAdd }: { user: FriendSearchResultDto; onAdd: () => void }) {
  return (
    <View style={styles.listRow}>
      <DiceBearAvatar seed={user.avatarSeed || user.username} size={50} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{user.displayName || user.username}</Text>
        <Text style={styles.rowSub}>Рядом в этом районе</Text>
      </View>
      <TouchableOpacity style={styles.addSmallBtn} onPress={onAdd}><Text style={styles.addSmallText}>Добавить</Text></TouchableOpacity>
    </View>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.settingsGroupTitle}>{title}</Text>
      <View style={styles.settingsGroup}>{children}</View>
    </View>
  );
}

function SettingsRow(props: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  copy?: boolean;
  switchValue?: boolean;
  onSwitch?: (value: boolean) => void;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={props.onPress} activeOpacity={props.onPress ? 0.84 : 1}>
      <View style={[styles.settingsIcon, { backgroundColor: `${props.tint}14` }]}>
        <Ionicons name={props.icon} size={27} color={props.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingsTitle} numberOfLines={2}>{props.title}</Text>
        <Text style={[styles.settingsSub, props.copy && { color: ACCENT }]} numberOfLines={2}>{props.subtitle}</Text>
      </View>
      {props.onSwitch ? (
        <Switch value={props.switchValue} onValueChange={props.onSwitch} trackColor={{ false: '#DFE3EA', true: '#9AE6C9' }} thumbColor={props.switchValue ? ACCENT : '#FFFFFF'} />
      ) : (
        <Ionicons name={props.copy ? 'copy-outline' : 'chevron-forward'} size={24} color={props.copy ? ACCENT : MUTED} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  avatarScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  topBar: { height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontFamily: FONT, color: TEXT, fontSize: 23, fontWeight: '900', letterSpacing: 0 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(17,24,39,0.07)' },
  iconButtonDanger: { backgroundColor: '#FFF5F5' },
  content: { paddingTop: 8, paddingBottom: 30, gap: 14 },
  modalContent: { padding: 16, paddingBottom: 34, gap: 16 },
  centerBox: { margin: 18, padding: 24, borderRadius: 26, backgroundColor: SURFACE, alignItems: 'center', gap: 12 },
  title: { color: TEXT, fontSize: 20, fontWeight: '900' },
  muted: { color: MUTED, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hero: { minHeight: 178, paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center' },
  sparkleOne: { position: 'absolute', top: 22, left: 18, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,92,246,0.22)' },
  sparkleTwo: { position: 'absolute', right: 28, top: 38, width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(16,185,129,0.18)' },
  avatarWrap: { position: 'relative', marginRight: 18 },
  heroAvatar: { borderWidth: 6, borderColor: '#FFFFFF' },
  avatarOnlineDot: { position: 'absolute', right: 6, bottom: 6, width: 21, height: 21, borderRadius: 11, backgroundColor: ACCENT, borderWidth: 3, borderColor: '#FFFFFF' },
  heroInfo: { flex: 1, gap: 6, minWidth: 0 },
  heroName: { color: TEXT, fontSize: 30, fontWeight: '900', letterSpacing: 0 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: MUTED, fontSize: 13, fontWeight: '800', flexShrink: 1 },
  codeLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  codeText: { color: MUTED, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  codeHint: { color: MUTED, fontSize: 11, fontWeight: '600', lineHeight: 14 },
  statsCard: { minHeight: 82, marginHorizontal: 18, borderRadius: 22, backgroundColor: SURFACE, flexDirection: 'row', padding: 10, gap: 6, boxShadow: '0 10px 24px rgba(17,24,39,0.05)' },
  statCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 0 },
  statIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: MUTED, fontSize: 9, fontWeight: '800', lineHeight: 11 },
  statValue: { color: TEXT, fontSize: 11, fontWeight: '900', marginTop: 1, lineHeight: 13 },
  blockCard: { marginHorizontal: 18, borderRadius: 22, backgroundColor: SURFACE, padding: 14, gap: 13, boxShadow: '0 10px 24px rgba(17,24,39,0.05)' },
  sectionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: TEXT, fontSize: 19, fontWeight: '900' },
  sectionMeta: { color: MUTED, fontSize: 13, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friendPreviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  friendBubble: { width: 64, alignItems: 'center', gap: 3 },
  smallDot: { position: 'absolute', right: 0, bottom: 1, width: 15, height: 15, borderRadius: 8, borderWidth: 3, borderColor: '#FFFFFF' },
  friendBubbleName: { maxWidth: 64, color: TEXT, fontSize: 12, fontWeight: '900' },
  friendBubbleSub: { color: MUTED, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  addBubble: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CBD1DD', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  addFriendButton: { display: 'none' },
  addFriendText: { color: ACCENT, fontSize: 15, fontWeight: '900' },
  placeRail: { gap: 12, paddingRight: 6 },
  placesOpenHitbox: { position: 'absolute', top: 8, right: 8, width: 96, height: 42, zIndex: 5 },
  meetingCard: { width: 150, minHeight: 72, borderRadius: 16, backgroundColor: '#F7F5FB', padding: 7, flexDirection: 'row', gap: 8 },
  placeCard: { width: 132, minHeight: 166, borderRadius: 16, backgroundColor: '#F7F5FB', padding: 7, gap: 8 },
  meetingImageBox: { width: 58, height: 58, borderRadius: 13, overflow: 'hidden' },
  placeImageBox: { height: 78, borderRadius: 14, overflow: 'hidden' },
  placeImage: { width: '100%', height: '100%' },
  placeImageFallback: { flex: 1, backgroundColor: '#DDEFE7' },
  placeBadge: { position: 'absolute', right: -1, bottom: -1, width: 34, height: 34, borderTopLeftRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  placeListRow: { minHeight: 82, borderRadius: 20, backgroundColor: SURFACE, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeListImageBox: { width: 62, height: 62, borderRadius: 15, overflow: 'hidden' },
  placeName: { color: TEXT, fontSize: 14, fontWeight: '900' },
  placeSub: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  visibilityCard: { minHeight: 88, marginHorizontal: 18, borderRadius: 22, backgroundColor: SURFACE, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, boxShadow: '0 10px 24px rgba(17,24,39,0.05)' },
  softIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: '#E9FFF6', alignItems: 'center', justifyContent: 'center' },
  actionKicker: { color: TEXT, fontSize: 12, fontWeight: '800' },
  actionTitle: { color: TEXT, fontSize: 16, fontWeight: '900', marginTop: 2, lineHeight: 20 },
  actionSub: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2, lineHeight: 16 },
  searchBox: { height: 50, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.28)', justifyContent: 'flex-end' },
  statusSheet: { backgroundColor: SURFACE, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: Platform.OS === 'ios' ? 34 : 24, gap: 8 },
  statusSheetTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statusOptionRow: { minHeight: 52, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusOptionRowActive: { backgroundColor: '#F0FDF7' },
  statusDotLarge: { width: 12, height: 12, borderRadius: 6 },
  statusOptionLabel: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '800' },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '700' },
  listSection: { gap: 10 },
  listTitle: { color: TEXT, fontSize: 16, fontWeight: '900' },
  countBadge: { color: PURPLE },
  listRow: { minHeight: 70, borderRadius: 20, backgroundColor: SURFACE, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestRow: { minHeight: 76, borderRadius: 20, backgroundColor: SURFACE, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { color: TEXT, fontSize: 15, fontWeight: '900' },
  rowSub: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  acceptBtn: { minHeight: 34, borderRadius: 12, backgroundColor: ACCENT, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  addSmallBtn: { minHeight: 34, borderRadius: 12, backgroundColor: '#E9FFF6', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  addSmallText: { color: ACCENT, fontSize: 12, fontWeight: '900' },
  emptyText: { color: MUTED, fontSize: 14, fontWeight: '700' },
  centerHint: { color: MUTED, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  bigCodeInput: { height: 62, borderRadius: 16, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, color: ACCENT, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 18 },
  primaryWide: { height: 52, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  primaryWideText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { color: MUTED, fontSize: 12, fontWeight: '800' },
  myCodeCard: { borderRadius: 22, padding: 18, alignItems: 'center', gap: 8 },
  myCodeTitle: { color: TEXT, fontSize: 13, fontWeight: '900' },
  myCodeName: { color: TEXT, fontSize: 18, fontWeight: '900' },
  myCodeValue: { color: MUTED, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  shareButton: { height: 42, borderRadius: 15, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareButtonText: { color: ACCENT, fontSize: 14, fontWeight: '900' },
  settingsGroupTitle: { color: MUTED, fontSize: 16, fontWeight: '900', marginLeft: 18, marginBottom: 8 },
  settingsGroup: { borderRadius: 22, backgroundColor: SURFACE, overflow: 'hidden', boxShadow: '0 10px 24px rgba(17,24,39,0.05)' },
  settingsRow: { minHeight: 70, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  settingsIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  settingsTitle: { color: TEXT, fontSize: 16, fontWeight: '900', lineHeight: 20 },
  settingsSub: { color: MUTED, fontSize: 13, fontWeight: '700', marginTop: 2, lineHeight: 17 },
  logoutCard: { minHeight: 74, borderRadius: 20, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 14 },
  logoutTitle: { color: '#DC2626', fontSize: 16, fontWeight: '900' },
  logoutSub: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  avatarContent: { padding: 18, paddingBottom: 40, gap: 18, alignItems: 'center' },
  saveLink: { color: PURPLE, fontSize: 14, fontWeight: '900' },
  editorAvatar: { borderWidth: 0 },
  avatarTabs: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingVertical: 8 },
  avatarTab: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 3 },
  avatarTabActive: { backgroundColor: '#F4EEFF', borderRadius: 14 },
  avatarTabText: { color: MUTED, fontSize: 10, fontWeight: '800' },
  avatarTabTextActive: { color: PURPLE },
  avatarGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  avatarOption: { width: 62, height: 62, borderRadius: 14, backgroundColor: '#F6F7FA', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  avatarOptionActive: { borderColor: PURPLE, backgroundColor: '#F4EEFF' },
  colorGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  roundSwatch: { width: 31, height: 31, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  roundSwatchActive: { borderWidth: 3, borderColor: PURPLE },
});
