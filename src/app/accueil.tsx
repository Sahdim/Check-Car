// Premier écran : choisir « Je suis le garagiste » ou « J'ai un code client ».
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeroCard, T, tap } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';

export default function Accueil() {
  const { setMode } = useStore();
  const choose = async (m: 'garage' | 'client') => {
    tap('medium');
    await setMode(m);
    router.replace(m === 'garage' ? '/vehicules' : '/client');
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Image source={require('@/assets/images/icon.png')} style={{ width: 96, height: 96, borderRadius: 22 }} />
          <Text style={T.large}>Check & Car</Text>
          <Text style={[T.sub, { textAlign: 'center', fontSize: 16 }]}>Le carnet d’entretien de tes véhicules, toujours dans la poche.</Text>
        </View>

        <Pressable onPress={() => choose('garage')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
          <HeroCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,159,10,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="construct" size={26} color={C.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.title, { fontSize: 20 }]}>Je suis le garagiste</Text>
                <Text style={T.sub}>Véhicules, interventions, rappels, clients</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={C.text3} />
            </View>
          </HeroCard>
        </Pressable>

        <Pressable
          onPress={() => choose('client')}
          style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: R.card, padding: 18, opacity: pressed ? 0.85 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(10,132,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="key" size={24} color={C.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[T.title, { fontSize: 20 }]}>J’ai un code client</Text>
              <Text style={T.sub}>Voir le carnet de mon véhicule</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={C.text3} />
          </View>
        </Pressable>

        <Text style={[T.tiny, { textAlign: 'center', marginTop: 8 }]}>Tu pourras changer de mode plus tard dans les réglages.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
