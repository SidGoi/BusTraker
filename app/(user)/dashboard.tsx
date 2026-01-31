import LiveMap from "@/components/LiveMap";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  LogOut,
  MapPin,
  ExternalLink,
  RefreshCw,
  WifiOff,
} from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";

const API_URL = "https://bus-traker-backend-82zs.vercel.app/api/buses";

export default function Dashboard() {
  const router = useRouter();
  const [busData, setBusData] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("Initializing...");
  const [isConnected, setIsConnected] = useState(true);

  const trackingInterval = useRef<any>(null);
  const netCheckInterval = useRef<any>(null);

  const handleLogout = () => {
    Alert.alert("End Shift", "Stop tracking and logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          if (trackingInterval.current) clearInterval(trackingInterval.current);
          if (netCheckInterval.current) clearInterval(netCheckInterval.current);
          await AsyncStorage.removeItem("bus_session");
          router.replace("/");
        },
      },
    ]);
  };

  useEffect(() => {
    const init = async () => {
      const session = await AsyncStorage.getItem("bus_session");
      if (session) {
        const parsed = JSON.parse(session);
        setBusData(parsed);
        startTracking(parsed.busId);
      }
    };
    init();

    netCheckInterval.current = setInterval(async () => {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(!!state.isConnected);
    }, 5000);

    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      if (netCheckInterval.current) clearInterval(netCheckInterval.current);
    };
  }, []);

  const startTracking = async (id: number) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    await sendLocationUpdate(id);
    trackingInterval.current = setInterval(() => sendLocationUpdate(id), 60000);
  };

  const sendLocationUpdate = async (id: number) => {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      setIsConnected(false);
      return;
    }

    setIsUpdating(true);
    try {
      const geo = await Location.getCurrentPositionAsync({ accuracy: 3 });
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId: id,
          location: [geo.coords.latitude, geo.coords.longitude],
        }),
      });

      if (res.ok) {
        setLastUpdateTime(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
        setIsConnected(true);
      }
    } catch (e) {
      setIsConnected(false);
    } finally {
      setTimeout(() => setIsUpdating(false), 1500);
    }
  };

  if (!busData)
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator color="#2563eb" />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* HEADER */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-200 bg-white">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3 border border-blue-100">
            <MapPin size={20} color="#2563eb" />
          </View>
          <View>
            <Text className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">
              {busData.zone} Sector
            </Text>
            <Text className="text-xl font-black text-slate-900">
              Fleet #{busData.busId}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100 active:bg-red-100"
        >
          <LogOut size={18} color="#ef4444" />
        </Pressable>
      </View>

      <View className="flex-1 relative">
        <LiveMap />

        {!isConnected && (
          <View className="absolute inset-0 bg-white items-center justify-center p-10 z-50">
            <View className="bg-red-50 p-6 rounded-full mb-4">
              <WifiOff size={60} color="#ef4444" />
            </View>
            <Text className="text-slate-900 text-xl font-black text-center">
              Connection Lost
            </Text>
            <Text className="text-slate-500 text-center mt-2 mb-8">
              GPS tracking is currently offline. Please check your signal.
            </Text>
            <Pressable
              onPress={() => sendLocationUpdate(busData.busId)}
              className="bg-blue-600 px-8 py-4 rounded-2xl flex-row items-center shadow-lg shadow-blue-200 active:bg-blue-700"
            >
              <RefreshCw size={20} color="white" />
              <Text className="text-white font-black ml-3 uppercase tracking-wider">Retry Connection</Text>
            </Pressable>
          </View>
        )}

        {/* STATUS CARD */}
        <View className="absolute top-4 left-6 right-6">
          <View className="bg-white p-5 px-8 rounded-[30px] shadow-xl border border-slate-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className={`w-2.5 h-2.5 rounded mr-2 ${isUpdating ? "bg-blue-500" : "bg-emerald-500"}`}
                />
                <Text className="text-slate-800 font-black text-[11px] uppercase tracking-[1.5px]">
                  {isUpdating ? "Refreshing GPS..." : "Tracking Active"}
                </Text>
              </View>
              {!isUpdating && (
                <Text className="text-slate-400 text-[10px] font-bold">
                  Last Sync: {lastUpdateTime}
                </Text>
              )}
            </View>
            {isUpdating && (
              <View className="absolute right-6 bottom-5">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* BOTTOM PANEL */}
      <View className="bg-white px-6 pt-6 pb-8 border-t border-slate-100">
        <Pressable
          onPress={() =>
            Linking.openURL("https://bus-attendance-sys.vercel.app/")
          }
          className="bg-blue-600 flex-row items-center justify-between px-6 py-5 rounded-[24px] shadow-lg shadow-blue-100 active:opacity-95"
        >
          <View className="flex-row items-center">
            <ExternalLink size={20} color="white" />
            <Text className="text-white text-lg font-black ml-3">
              Attendance Portal
            </Text>
          </View>
          <ArrowRight size={22} color="white" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}