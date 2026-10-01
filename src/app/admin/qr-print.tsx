import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SidebarNavigation } from '@/components/sidebar-navigation';

export interface PrintableBox {
  id: string;
  code: string;
  category: 'MAIN_BOX' | 'SUB_BOX';
  parentCode?: string;
  siteName: string;
  address: string;
  zone: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'NEEDS_TAG' | 'ISSUE';
  totalPorts: number;
  activePorts: number;
  qrToken: string;
}

const STATIC_BOXES_DATA: PrintableBox[] = [
  {
    id: '5',
    code: 'DB-SB-04',
    category: 'SUB_BOX',
    parentCode: 'DB-MN-02',
    siteName: 'Robinsons Place Iligan - Floor 2 Rack',
    address: 'Macapagal Ave, Iligan City',
    zone: 'Zone 3 - Commercial District',
    latitude: 8.2205,
    longitude: 124.2385,
    status: 'NEEDS_TAG',
    totalPorts: 32,
    activePorts: 12,
    qrToken: 'QRTECH-BOX-ILG-SB04-7731',
  },
  {
    id: '6',
    code: 'DB-SB-05',
    category: 'SUB_BOX',
    parentCode: 'DB-MN-01',
    siteName: 'Tambo Terminal Distribution Enclosure',
    address: 'Hinaplanon-Tambo Highway, Iligan City',
    zone: 'Zone 4 - North Transport Hub',
    latitude: 8.2490,
    longitude: 124.2610,
    status: 'NEEDS_TAG',
    totalPorts: 16,
    activePorts: 8,
    qrToken: 'QRTECH-BOX-ILG-SB05-6612',
  },
  {
    id: '1',
    code: 'DB-MN-01',
    category: 'MAIN_BOX',
    siteName: 'Iligan City Hall / Aguinaldo Central Hub',
    address: 'Aguinaldo St, Poblacion, Iligan City',
    zone: 'Zone 1 - Poblacion Civic Center',
    latitude: 8.2285,
    longitude: 124.2415,
    status: 'ACTIVE',
    totalPorts: 48,
    activePorts: 42,
    qrToken: 'QRTECH-BOX-ILG-MN01-8891',
  },
  {
    id: '2',
    code: 'DB-MN-02',
    category: 'MAIN_BOX',
    siteName: 'Aguinaldo Secondary Distribution Center',
    address: 'Roxas Ave cor. Aguinaldo, Iligan City',
    zone: 'Zone 2 - Roxas Midtown',
    latitude: 8.2238,
    longitude: 124.2458,
    status: 'ACTIVE',
    totalPorts: 32,
    activePorts: 28,
    qrToken: 'QRTECH-BOX-ILG-MN02-4412',
  },
  {
    id: '3',
    code: 'DB-SB-02',
    category: 'SUB_BOX',
    parentCode: 'DB-MN-01',
    siteName: 'MSU-IIT Tibanga Campus Node',
    address: 'Andres Bonifacio Ave, Tibanga, Iligan City',
    zone: 'Zone 5 - University District',
    latitude: 8.2415,
    longitude: 124.2440,
    status: 'ACTIVE',
    totalPorts: 32,
    activePorts: 24,
    qrToken: 'QRTECH-BOX-ILG-SB02-9901',
  },
  {
    id: '4',
    code: 'DB-SB-03',
    category: 'SUB_BOX',
    parentCode: 'DB-MN-01',
    siteName: 'Tubod Commercial Distribution Node',
    address: 'Macapagal Highway, Tubod, Iligan City',
    zone: 'Zone 6 - Tubod South Corridor',
    latitude: 8.2140,
    longitude: 124.2360,
    status: 'ACTIVE',
    totalPorts: 24,
    activePorts: 18,
    qrToken: 'QRTECH-BOX-ILG-SB03-1204',
  },
  {
    id: '7',
    code: 'DB-SB-06',
    category: 'SUB_BOX',
    parentCode: 'DB-MN-02',
    siteName: 'Del Carmen Secondary Sub-Box',
    address: 'Del Carmen, Iligan City',
    zone: 'Zone 7 - Del Carmen Heights',
    latitude: 8.2320,
    longitude: 124.2590,
    status: 'ISSUE',
    totalPorts: 24,
    activePorts: 16,
    qrToken: 'QRTECH-BOX-ILG-SB06-3390',
  },
];

type FilterType = 'ALL' | 'NEEDS_TAG' | 'MAIN_BOX' | 'SUB_BOX';

/**
 * Standard Placard Component (Reference Design)
 * 1. Dashed rounded outer border
 * 2. Header with green QR badge + "MULTIFACTORS · ILIGAN"
 * 3. Soft white rounded container with centered crisp QR code
 * 4. Box Code (e.g. DB-MN-01)
 * 5. Classification (e.g. MAIN DISTRIBUTION HUB)
 * 6. Site Name / Location
 * 7. Security Token ID
 */
function PlacardCard({ box }: { box: PrintableBox }) {
  return (
    <View className="w-full max-w-[360px] self-center border-2 border-dashed border-slate-300 rounded-[32px] p-6 bg-white flex-col items-center justify-between shadow-xs my-2">
      {/* 1. Header: Brand Logo & City Name */}
      <View className="flex-row items-center justify-center mb-2">
        <View className="w-6 h-6 rounded-lg bg-[#4d6029] items-center justify-center mr-2 shadow-xs">
          <MaterialCommunityIcons name="qrcode-scan" size={13} color="#ffffff" />
        </View>
        <Text className="text-xs font-poppins-bold text-[#0f172a] uppercase tracking-wider">
          MULTIFACTORS · ILIGAN
        </Text>
      </View>

      {/* 2. QR Code Frame Container */}
      <View className="w-44 h-44 bg-[#f8fafc] border border-slate-200/80 rounded-3xl items-center justify-center p-2.5 my-2 shadow-inner">
        <Image
          source={{
            uri: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
              box.qrToken
            )}`,
          }}
          className="w-36 h-36"
          resizeMode="contain"
        />
      </View>

      {/* 3. Centered Identification Block */}
      <View className="items-center text-center w-full px-2 mt-1">
        {/* Box Code */}
        <Text className="text-2xl font-poppins-bold text-[#0f172a] tracking-wide">
          {box.code}
        </Text>

        {/* Classification Tier */}
        <Text className="text-xs font-poppins-bold text-[#4d6029] uppercase tracking-wider mt-0.5">
          {box.category === 'MAIN_BOX' ? 'MAIN DISTRIBUTION HUB' : 'BRANCH SUB-BOX'}
        </Text>

        {/* Site Location Name */}
        <Text
          className="text-xs font-poppins-medium text-[#475569] text-center mt-1 max-w-[95%]"
          numberOfLines={2}
        >
          {box.siteName}
        </Text>

        {/* Verification Token Key */}
        <Text className="text-[10px] font-mono text-[#94a3b8] text-center mt-1 tracking-wider">
          {box.qrToken}
        </Text>
      </View>
    </View>
  );
}

export default function QRPrintScreen() {
  const [boxes] = useState<PrintableBox[]>(STATIC_BOXES_DATA);
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>(['5', '6']); // Default selecting the 2 untagged boxes
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('NEEDS_TAG');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [showDuplicateIfSingle, setShowDuplicateIfSingle] = useState(true);

  const isWeb = Platform.OS === 'web';

  // Filter boxes based on filter and search
  const filteredBoxes = boxes.filter((box) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      query === '' ||
      box.code.toLowerCase().includes(query) ||
      box.siteName.toLowerCase().includes(query) ||
      box.address.toLowerCase().includes(query) ||
      box.zone.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (activeFilter === 'NEEDS_TAG') return box.status === 'NEEDS_TAG';
    if (activeFilter === 'MAIN_BOX') return box.category === 'MAIN_BOX';
    if (activeFilter === 'SUB_BOX') return box.category === 'SUB_BOX';
    return true;
  });

  // Selected boxes in order
  const selectedBoxes = boxes.filter((box) => selectedBoxIds.includes(box.id));

  // Partition selected boxes into A4 Sheets (2 boxes per sheet)
  const a4Sheets: { top: PrintableBox; bottom: PrintableBox | null }[] = [];
  for (let i = 0; i < selectedBoxes.length; i += 2) {
    const top = selectedBoxes[i];
    const bottom =
      i + 1 < selectedBoxes.length
        ? selectedBoxes[i + 1]
        : showDuplicateIfSingle
        ? top
        : null;
    a4Sheets.push({ top, bottom });
  }

  const currentSheet =
    a4Sheets.length > 0
      ? a4Sheets[Math.min(activeSheetIndex, a4Sheets.length - 1)]
      : null;

  const handleToggleSelectBox = (id: string) => {
    if (selectedBoxIds.includes(id)) {
      setSelectedBoxIds(selectedBoxIds.filter((item) => item !== id));
    } else {
      setSelectedBoxIds([...selectedBoxIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredBoxes.map((b) => b.id);
    const newSelected = Array.from(new Set([...selectedBoxIds, ...allFilteredIds]));
    setSelectedBoxIds(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedBoxIds([]);
    setActiveSheetIndex(0);
  };

  const handlePrint = () => {
    if (isWeb) {
      window.print();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f0f3f6]">
      <StatusBar style="dark" />

      {/* Web Print Media Styles for Native A4 Output */}
      {isWeb && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body, html {
                  background: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print, nav, aside, header {
                  display: none !important;
                }
                .print-canvas-wrapper {
                  display: block !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .a4-print-page {
                  page-break-after: always !important;
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  width: 100% !important;
                  max-width: 210mm !important;
                  height: 297mm !important;
                  max-height: 297mm !important;
                  padding: 10mm 12mm !important;
                  background: white !important;
                  box-sizing: border-box !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
              }
            `,
          }}
        />
      )}

      <View className="flex-1 flex-row h-full">
        {/* Collapsible Sidebar Navigation */}
        {isWeb && (
          <SidebarNavigation
            activeRoute="/admin/qr-print"
            collapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex no-print"
          />
        )}

        {/* Main Content Area */}
        <View className="flex-1 flex-col h-full overflow-hidden">
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 p-4 md:p-6"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Top Page Header */}
            <View className="flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-200/80 gap-4 mb-5 no-print">
              <View>
                <View className="flex-row items-center">
                  <View className="w-9 h-9 rounded-2xl bg-[#4d6029]/10 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="printer" size={20} color="#4d6029" />
                  </View>
                  <Text className="text-2xl font-poppins-bold text-[#0f172a]">
                    Print QR Labels (A4 Bondpaper)
                  </Text>
                </View>
                <Text className="text-xs font-poppins text-[#64748b] mt-1 ml-12">
                  Batch format standard A4 bondpaper sheets with 2 high-resolution QR placards per page.
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center space-x-2.5">
                <TouchableOpacity
                  onPress={() => router.push('/admin/box-management')}
                  className="bg-white border border-slate-200/80 px-4 py-2.5 rounded-2xl flex-row items-center shadow-sm mr-2"
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="server-network" size={16} color="#475569" />
                  <Text className="text-xs font-poppins-bold text-[#334155] ml-1.5">
                    Box Inventory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePrint}
                  disabled={selectedBoxIds.length === 0}
                  className={`px-5 py-2.5 rounded-2xl flex-row items-center shadow-md ${
                    selectedBoxIds.length === 0
                      ? 'bg-slate-300 shadow-none'
                      : 'bg-[#4d6029] shadow-[#4d6029]/25'
                  }`}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="printer" size={18} color="#ffffff" />
                  <Text className="text-xs font-poppins-bold text-white ml-1.5">
                    Print {a4Sheets.length} A4 Sheet{a4Sheets.length > 1 ? 's' : ''} ({selectedBoxIds.length} QR)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Status Bar */}
            <View className="flex-row flex-wrap items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm mb-5 gap-3 no-print">
              <View className="flex-row items-center flex-wrap gap-4">
                <View className="flex-row items-center">
                  <View className="w-7 h-7 rounded-xl bg-amber-50 items-center justify-center mr-2 border border-amber-200">
                    <MaterialCommunityIcons name="qrcode-scan" size={15} color="#d97706" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-poppins text-[#64748b]">Awaiting Physical Tag</Text>
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      {boxes.filter((b) => b.status === 'NEEDS_TAG').length} Distribution Boxes
                    </Text>
                  </View>
                </View>

                <View className="h-7 w-[1px] bg-slate-200" />

                <View className="flex-row items-center">
                  <View className="w-7 h-7 rounded-xl bg-emerald-50 items-center justify-center mr-2 border border-emerald-200">
                    <Ionicons name="document-text-outline" size={15} color="#059669" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-poppins text-[#64748b]">Paper Layout Specification</Text>
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      A4 (210 x 297mm) · 2 Placards / Sheet
                    </Text>
                  </View>
                </View>

                <View className="h-7 w-[1px] bg-slate-200" />

                <View className="flex-row items-center">
                  <View className="w-7 h-7 rounded-xl bg-slate-100 items-center justify-center mr-2 border border-slate-200">
                    <Ionicons name="checkbox-outline" size={15} color="#475569" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-poppins text-[#64748b]">Selected for Printing</Text>
                    <Text className="text-xs font-poppins-bold text-[#4d6029]">
                      {selectedBoxIds.length} Boxes ({a4Sheets.length} Sheets)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Single Box Odd-number toggle */}
              <TouchableOpacity
                onPress={() => setShowDuplicateIfSingle(!showDuplicateIfSingle)}
                className="flex-row items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200"
              >
                <Ionicons
                  name={showDuplicateIfSingle ? 'checkbox' : 'square-outline'}
                  size={16}
                  color={showDuplicateIfSingle ? '#4d6029' : '#94a3b8'}
                />
                <Text className="text-[11px] font-poppins-medium text-[#475569] ml-1.5">
                  Auto-fill blank half with duplicate backup
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2-COLUMN WORKSPACE: LEFT SELECTOR | RIGHT LIVE A4 SHEET PREVIEW */}
            <View className="flex-col lg:flex-row gap-6">
              {/* LEFT COLUMN: Box Selection & Batch Queue (40% width) */}
              <View className="w-full lg:w-5/12 flex-col gap-4 no-print">
                {/* Filter & Search Box Card */}
                <View className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                  {/* Search input */}
                  <View className="flex-row items-center bg-[#f8fafc] border border-slate-200/80 rounded-2xl px-3.5 py-2.5 mb-3">
                    <Ionicons name="search" size={16} color="#64748b" />
                    <TextInput
                      placeholder="Search box code, site, or zone..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      className="flex-1 ml-2 text-xs font-poppins text-[#0f172a]"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={15} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filter Pills */}
                  <View className="flex-row items-center flex-wrap gap-1.5 mb-3">
                    {[
                      { id: 'NEEDS_TAG', label: 'Needs QR Tag (2)' },
                      { id: 'ALL', label: `All Boxes (${boxes.length})` },
                      { id: 'MAIN_BOX', label: 'Main Hubs' },
                      { id: 'SUB_BOX', label: 'Sub-Boxes' },
                    ].map((tab) => (
                      <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveFilter(tab.id as FilterType)}
                        className={`px-3 py-1.5 rounded-xl border ${
                          activeFilter === tab.id
                            ? 'bg-[#4d6029] border-[#4d6029]'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-poppins-bold ${
                            activeFilter === tab.id ? 'text-white' : 'text-[#475569]'
                          }`}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Batch Select Controls */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                    <TouchableOpacity
                      onPress={handleSelectAllFiltered}
                      className="flex-row items-center"
                    >
                      <Ionicons name="checkmark-done-outline" size={14} color="#4d6029" />
                      <Text className="text-[11px] font-poppins-bold text-[#4d6029] ml-1">
                        Select All Filtered ({filteredBoxes.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleClearSelection}>
                      <Text className="text-[11px] font-poppins-medium text-[#64748b]">
                        Clear Selection
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Box Selection List */}
                <View className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <View className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between">
                    <Text className="text-xs font-poppins-bold text-[#0f172a]">
                      Enclosure Directory ({filteredBoxes.length})
                    </Text>
                    <Text className="text-[11px] font-poppins text-[#64748b]">
                      Click checkbox to add to A4 queue
                    </Text>
                  </View>

                  <View className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
                    {filteredBoxes.map((box) => {
                      const isSelected = selectedBoxIds.includes(box.id);
                      return (
                        <TouchableOpacity
                          key={box.id}
                          onPress={() => handleToggleSelectBox(box.id)}
                          activeOpacity={0.7}
                          className={`p-4 flex-row items-center justify-between transition-colors ${
                            isSelected ? 'bg-[#4d6029]/5' : 'hover:bg-slate-50'
                          }`}
                        >
                          <View className="flex-row items-center flex-1 mr-3">
                            <View className="mr-3">
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isSelected ? '#4d6029' : '#cbd5e1'}
                              />
                            </View>

                            <View className="flex-1">
                              <View className="flex-row items-center">
                                <Text className="text-xs font-poppins-bold text-[#0f172a]">
                                  {box.code}
                                </Text>
                                <View
                                  className={`ml-2 px-2 py-0.5 rounded-md ${
                                    box.category === 'MAIN_BOX'
                                      ? 'bg-[#4d6029]/10'
                                      : 'bg-sky-100'
                                  }`}
                                >
                                  <Text
                                    className={`text-[9px] font-poppins-bold uppercase ${
                                      box.category === 'MAIN_BOX'
                                        ? 'text-[#4d6029]'
                                        : 'text-sky-800'
                                    }`}
                                  >
                                    {box.category === 'MAIN_BOX' ? 'Main Hub' : 'Sub-Box'}
                                  </Text>
                                </View>

                                {box.status === 'NEEDS_TAG' && (
                                  <View className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200">
                                    <Text className="text-[8px] font-poppins-bold text-amber-800">
                                      Needs Tag
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Text
                                className="text-xs font-poppins-medium text-[#334155] mt-0.5"
                                numberOfLines={1}
                              >
                                {box.siteName}
                              </Text>

                              <Text
                                className="text-[10px] font-poppins text-[#64748b]"
                                numberOfLines={1}
                              >
                                {box.address} · {box.zone}
                              </Text>
                            </View>
                          </View>

                          <View className="items-end">
                            <Text className="text-[10px] font-mono text-[#64748b]">
                              {box.totalPorts} Ports
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* RIGHT COLUMN: LIVE A4 BONDPAPER SHEET PREVIEW (60% width) */}
              <View className="w-full lg:w-7/12 flex-col gap-4 print-canvas-wrapper">
                {/* Preview Toolbar */}
                <View className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex-row items-center justify-between no-print">
                  <View className="flex-row items-center">
                    <Ionicons name="eye-outline" size={16} color="#475569" />
                    <Text className="text-xs font-poppins-bold text-[#0f172a] ml-1.5">
                      Live A4 Sheet Preview
                    </Text>
                    {a4Sheets.length > 0 && (
                      <View className="bg-slate-100 px-2 py-0.5 rounded-full ml-2">
                        <Text className="text-[10px] font-poppins-bold text-[#475569]">
                          Sheet {activeSheetIndex + 1} of {a4Sheets.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Sheet Navigation Pills */}
                  {a4Sheets.length > 1 && (
                    <View className="flex-row items-center space-x-1">
                      <TouchableOpacity
                        onPress={() => setActiveSheetIndex(Math.max(0, activeSheetIndex - 1))}
                        disabled={activeSheetIndex === 0}
                        className={`p-1.5 rounded-lg border ${
                          activeSheetIndex === 0
                            ? 'bg-slate-50 border-slate-200 opacity-40'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Ionicons name="chevron-back" size={14} color="#475569" />
                      </TouchableOpacity>

                      {a4Sheets.map((_, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setActiveSheetIndex(idx)}
                          className={`w-7 h-7 rounded-lg items-center justify-center border mx-0.5 ${
                            activeSheetIndex === idx
                              ? 'bg-[#4d6029] border-[#4d6029]'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-poppins-bold ${
                              activeSheetIndex === idx ? 'text-white' : 'text-[#475569]'
                            }`}
                          >
                            {idx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <TouchableOpacity
                        onPress={() =>
                          setActiveSheetIndex(Math.min(a4Sheets.length - 1, activeSheetIndex + 1))
                        }
                        disabled={activeSheetIndex === a4Sheets.length - 1}
                        className={`p-1.5 rounded-lg border ${
                          activeSheetIndex === a4Sheets.length - 1
                            ? 'bg-slate-50 border-slate-200 opacity-40'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Ionicons name="chevron-forward" size={14} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Direct Print Button */}
                  <TouchableOpacity
                    onPress={handlePrint}
                    disabled={!currentSheet}
                    className={`px-4 py-2 rounded-xl flex-row items-center ${
                      !currentSheet ? 'bg-slate-300' : 'bg-[#4d6029]'
                    }`}
                  >
                    <Ionicons name="print-outline" size={15} color="#ffffff" />
                    <Text className="text-xs font-poppins-bold text-white ml-1.5">
                      Print A4 Sheet
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* THE ACTUAL A4 BONDPAPER SHEET CANVAS */}
                {currentSheet ? (
                  <View className="bg-white rounded-3xl shadow-xl border border-slate-300 p-6 md:p-8 a4-print-page w-full min-h-[780px] flex-col justify-between">
                    {/* PLACARD 1: TOP HALF (210mm x 148.5mm reference design) */}
                    <PlacardCard box={currentSheet.top} />

                    {/* CENTER CUT GUIDE (Exact Middle 148.5mm line) */}
                    <View className="my-2.5 flex-row items-center justify-center no-print">
                      <View className="flex-1 border-b border-dashed border-slate-300" />
                      <View className="flex-row items-center bg-slate-50 px-3 py-1 rounded-full mx-2 border border-slate-200">
                        <MaterialCommunityIcons name="content-cut" size={12} color="#64748b" />
                        <Text className="text-[9px] font-poppins-medium text-[#64748b] uppercase tracking-wider ml-1">
                          Cut Along Line (A4 Center 148.5mm)
                        </Text>
                      </View>
                      <View className="flex-1 border-b border-dashed border-slate-300" />
                    </View>

                    {/* PLACARD 2: BOTTOM HALF (210mm x 148.5mm reference design) */}
                    {currentSheet.bottom ? (
                      <PlacardCard box={currentSheet.bottom} />
                    ) : (
                      /* Blank Half State */
                      <View className="w-full max-w-[360px] self-center border-2 border-dashed border-slate-300 rounded-[32px] p-8 bg-slate-50/50 items-center justify-center my-2 min-h-[260px]">
                        <Ionicons name="document-outline" size={32} color="#94a3b8" />
                        <Text className="text-xs font-poppins-bold text-[#64748b] mt-2">
                          Blank Bottom Half (Reserved for 2nd Box)
                        </Text>
                        <Text className="text-[11px] font-poppins text-[#94a3b8] mt-1 text-center">
                          Select an even number of boxes or check &quot;Auto-fill blank half with duplicate backup&quot; above.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm items-center justify-center">
                    <MaterialCommunityIcons name="printer-alert" size={48} color="#cbd5e1" />
                    <Text className="text-base font-poppins-bold text-[#0f172a] mt-3">
                      No Boxes Selected for Printing
                    </Text>
                    <Text className="text-xs font-poppins text-[#64748b] mt-1 text-center max-w-sm">
                      Check one or more distribution boxes on the left to generate your printable A4 bondpaper sheet.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
