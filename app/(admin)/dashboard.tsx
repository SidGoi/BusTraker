import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Linking,
  TextInput,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  LogOut,
  ShieldCheck,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Clock,
  Info,
  Globe,
  ArrowRight,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AdminLiveMap from "@/components/AdminLiveMap";
import { StatusBar } from "expo-status-bar";

const API_URL = "https://bus-traker-backend-82zs.vercel.app/api/buses";

export default function AdminDashboard() {
  const router = useRouter();
  const [adminData, setAdminData] = useState<any>(null);
  const [allBuses, setAllBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedBus, setSelectedBus] = useState<any>(null);

  const mapRef = useRef<any>(null);

  const normalize = (str: string) => str.toLowerCase().replace(/[\s-]/g, "");

  const zoneBuses = useMemo(() => {
    if (!adminData?.zone || allBuses.length === 0) return [];
    const targetZone = normalize(adminData.zone);
    return allBuses.filter((bus) => bus.zone && normalize(bus.zone) === targetZone);
  }, [allBuses, adminData]);

  useEffect(() => {
    const initAdmin = async () => {
      const session = await AsyncStorage.getItem("bus_session");
      if (session) {
        const parsed = JSON.parse(session);
        setAdminData(parsed);
        fetchBuses();
        const interval = setInterval(fetchBuses, 5000);
        return () => clearInterval(interval);
      }
    };
    initAdmin();
  }, []);

  const fetchBuses = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(API_URL);
      const json = await response.json();
      if (json.success) {
        setAllBuses(json.data);
        if (selectedBus) {
          const updated = json.data.find((b: any) => b.busId === selectedBus.busId);
          if (updated) setSelectedBus(updated);
        }
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const getStatus = (lastUpdate?: string) => {
    if (!lastUpdate) return { active: false, label: "INACTIVE" };
    const diff = (new Date().getTime() - new Date(lastUpdate).getTime()) / 60000;
    return { active: diff <= 3, label: diff <= 3 ? "ACTIVE" : "INACTIVE" };
  };

  const counts = useMemo(() => {
    const active = zoneBuses.filter((b) => getStatus(b.lastUpdate).active).length;
    return { active, inactive: zoneBuses.length - active };
  }, [zoneBuses]);

  const handleLogout = () => {
    Alert.alert("Terminate Session", "Exit Admin Control Panel?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("bus_session");
          router.replace("/");
        },
      },
    ]);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const found = zoneBuses.find((b) => b.busId.toString() === text.trim());
    if (found && mapRef.current) {
      mapRef.current.animateToRegion({
          latitude: found.location[0],
          longitude: found.location[1],
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      setSelectedBus(found);
    }
  };

  if (loading) return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-emerald-600 font-bold mt-4 uppercase tracking-widest">Initialising Sector Intel</Text>
      </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200 bg-white">
        <View className="flex-row items-center">
          <ShieldCheck size={24} color="#059669" />
          <View className="ml-3">
            <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sector Admin</Text>
            <Text className="text-xl font-black text-slate-900 uppercase tracking-tighter">{adminData?.zone}</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100 active:opacity-60">
          <LogOut size={18} color="#ef4444" />
        </Pressable>
      </View>

      {/* SEARCH BAR */}
      <View className="px-6 py-3 bg-white">
        <View className="flex-row items-center bg-slate-100 rounded-2xl px-4 border border-slate-200">
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder={`Search ${adminData?.zone} Units...`}
            placeholderTextColor="#94a3b8"
            className="flex-1 h-12 ml-3 text-slate-900 font-medium"
            value={searchQuery}
            onChangeText={handleSearch}
            keyboardType="numeric"
          />
          {searchQuery !== "" && (
            <Pressable onPress={() => { setSearchQuery(""); setSelectedBus(null); }}><X size={18} color="#64748b" /></Pressable>
          )}
        </View>
      </View>

      {/* STATS BAR */}
      <Pressable onPress={() => setStatusModalVisible(true)} className="mx-6 mb-4 flex-row bg-white p-3 rounded-2xl border border-slate-200 shadow-sm justify-around items-center">
        <View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /><Text className="text-slate-700 font-bold">{counts.active} Active</Text></View>
        <View className="w-[1px] h-4 bg-slate-200" /><View className="flex-row items-center"><View className="w-2 h-2 rounded-full bg-slate-300 mr-2" /><Text className="text-slate-500 font-bold">{counts.inactive} Inactive</Text></View>
        <Info size={16} color="#059669" />
      </Pressable>

      <View className="flex-1 relative">
        <AdminLiveMap buses={zoneBuses} mapRef={mapRef} searchQuery={searchQuery} onBusPress={setSelectedBus} />
        
        {/* SURVEILLANCE OVERLAY */}
        <View className="absolute top-4 left-6 right-6">
          <View className="bg-white p-3 rounded-2xl shadow-md border border-slate-100 flex-row items-center justify-between">
            <View className="flex-row items-center"><Globe size={16} color="#059669" /><Text className="ml-2 font-bold text-slate-800 text-[11px] uppercase tracking-wider">Sector Surveillance</Text></View>
            <View className="flex-row gap-2 items-center">{isRefreshing && <RefreshCw size={10} color="#059669" />}<Text className="text-slate-400 text-[9px] font-black uppercase">Live Link</Text></View>
          </View>
        </View>

        {/* DETAIL CARD */}
        {!!selectedBus && (
          <View className="absolute bottom-6 left-6 right-6 bg-white rounded-[32px] p-6 shadow-2xl border border-slate-200">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-2xl font-black text-slate-900">Bus #{selectedBus.busId}</Text>
                <Text className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">{selectedBus.zone} Sector</Text>
              </View>
              <View className={`px-4 py-1.5 rounded-full ${getStatus(selectedBus.lastUpdate).active ? "bg-emerald-100" : "bg-slate-100"}`}>
                <Text className={`text-[10px] font-black ${getStatus(selectedBus.lastUpdate).active ? "text-emerald-600" : "text-slate-500"}`}>{getStatus(selectedBus.lastUpdate).label}</Text>
              </View>
            </View>
            <View className="flex-row items-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <Clock size={16} color="#059669" />
              <View className="ml-3">
                <Text className="text-slate-400 text-[10px] font-bold uppercase">Last GPS Pulse</Text>
                <Text className="text-slate-900 font-black text-sm">{selectedBus.lastUpdate ? new Date(selectedBus.lastUpdate).toLocaleTimeString() : "Waiting..."}</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable onPress={() => setSelectedBus(null)} className="flex-1 bg-slate-100 py-4 rounded-2xl items-center active:bg-slate-200"><Text className="text-slate-600 font-bold">Dismiss</Text></Pressable>
              <Pressable onPress={() => Linking.openURL("https://bus-attendance-sys.vercel.app/")} className="flex-row items-center justify-center flex-[1.5] bg-emerald-600 py-4 rounded-2xl shadow-lg shadow-emerald-200 active:opacity-80"><ExternalLink size={18} color="white" /><Text className="text-white font-bold ml-2">Open Portal</Text></Pressable>
            </View>
          </View>
        )}
      </View>

      {/* PORTAL LINK */}
      {!selectedBus && (
        <View className="bg-white px-6 pt-6 pb-8 border-t border-slate-100">
          <Pressable onPress={() => Linking.openURL("https://bus-attendance-sys.vercel.app/")} className="bg-emerald-600 flex-row items-center justify-between px-6 py-5 rounded-[24px] shadow-lg active:opacity-90 shadow-emerald-200">
            <View className="flex-row items-center"><ExternalLink size={20} color="white" /><Text className="text-white text-lg font-black ml-3">Attendance Portal</Text></View>
            <ArrowRight size={22} color="white" />
          </Pressable>
        </View>
      )}

      {/* REGISTRY MODAL */}
      <Modal visible={isStatusModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[40px] p-6 h-3/4 shadow-2xl">
            <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
            <View className="flex-row justify-between items-center mb-6 px-2">
              <Text className="text-2xl font-black text-slate-900">Registry Directory</Text>
              <Pressable onPress={() => setStatusModalVisible(false)} className="bg-slate-100 p-2 rounded-full"><X size={20} color="#64748b" /></Pressable>
            </View>
            <FlatList
              data={zoneBuses}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const { active, label } = getStatus(item.lastUpdate);
                return (
                  <Pressable
                    onPress={() => {
                      setSelectedBus(item);
                      setStatusModalVisible(false);
                      mapRef.current?.animateToRegion({ latitude: item.location[0], longitude: item.location[1], latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000);
                    }}
                    className="bg-white p-4 rounded-2xl mb-3 flex-row justify-between items-center border border-slate-100 shadow-sm"
                  >
                    <View><Text className="text-slate-900 font-bold text-lg">Bus #{item.busId}</Text><Text className="text-slate-400 text-xs uppercase font-medium">{item.zone} Sector</Text></View>
                    <View className={`${active ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"} px-3 py-1 rounded-full border`}><Text className={`${active ? "text-emerald-600" : "text-slate-400"} font-bold text-[10px]`}>{label}</Text></View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}