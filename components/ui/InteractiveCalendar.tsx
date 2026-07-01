import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCalendar } from '../../hooks/useCalendar';
import { IconSymbol } from './icon-symbol';

export function InteractiveCalendar({ colors, lang }: { colors: any; lang: 'es' | 'en' }) {
  const { events, addEvent, removeEvent, refreshEvents } = useCalendar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [isHourlyView, setIsHourlyView] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // Form State
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const messageInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Find first hour with an event
  const getFirstEventHour = useCallback((dateKey: string): number | null => {
    const dayEvents = events.filter(e => e.date === dateKey);
    if (dayEvents.length === 0) return null;
    
    let firstHour = 24;
    for (const ev of dayEvents) {
      const [h] = ev.start_time.split(':').map(Number);
      if (h < firstHour) {
        firstHour = h;
      }
    }
    return firstHour === 24 ? null : firstHour;
  }, [events]);

  useEffect(() => {
    if (isHourlyView) {
      const firstHour = getFirstEventHour(selectedDay);
      if (firstHour !== null) {
        setTimeout(() => {
          const rowHeight = 40;
          scrollViewRef.current?.scrollTo({
            y: firstHour * rowHeight,
            animated: true
          });
        }, 150);
      }
    }
  }, [isHourlyView, selectedDay, getFirstEventHour]);

  // Labels based on language
  const t = {
    es: {
      createApp: 'Crear Cita',
      saveApp: 'Guardar Cita',
      msgPlaceholder: 'Mensaje de la cita...',
      dayBtn: 'Día',
      startBtn: 'Hora Inicio',
      endBtn: 'Hora Fin (Opcional)',
      days: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
      months: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ],
      noEvents: 'Sin citas para esta hora.',
      errorFill: 'Por favor ingresa un mensaje y la hora de inicio.',
      errorTime: 'La hora de fin debe ser mayor a la de inicio.',
      cancelBtn: 'Cancelar'
    },
    en: {
      createApp: 'Create Appointment',
      saveApp: 'Save Appointment',
      msgPlaceholder: 'Appointment message...',
      dayBtn: 'Day',
      startBtn: 'Start Time',
      endBtn: 'End Time (Optional)',
      days: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      months: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ],
      noEvents: 'No appointments at this hour.',
      errorFill: 'Please enter a message and start time.',
      errorTime: 'End time must be after start time.',
      cancelBtn: 'Cancel'
    }
  }[lang || 'es'];

  // Helper: pad numbers
  const pad = (n: number) => String(n).padStart(2, '0');

  // Format Date to Key: YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  // Convert 24h string "HH:MM" to formatted AM/PM string
  const format24hToAmPm = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${pad(displayHour)}:${pad(m)} ${ampm}`;
  };

  // Format Date object to AM/PM string
  const formatTimeObjectToAmPm = (date: Date | null) => {
    if (!date) return '';
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${pad(displayHour)}:${pad(m)} ${ampm}`;
  };

  // Helper to parse HH:MM 24h back to Date object
  const parseTimeToDate = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Navigate Months
  const changeMonth = (direction: number) => {
    const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
    setCurrentDate(next);
  };

  // Get days of the current month grid (including padding from prev/next months)
  const getDaysGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const prevMonthLast = new Date(year, month, 0).getDate();
    const firstDayIndex = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const grid = [];

    // Days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const dateObj = new Date(year, month - 1, d);
      grid.push({
        dayNum: d,
        dateKey: formatDateKey(dateObj),
        isCurrentMonth: false,
      });
    }

    // Days from current month
    for (let i = 1; i <= totalDays; i++) {
      const dateObj = new Date(year, month, i);
      grid.push({
        dayNum: i,
        dateKey: formatDateKey(dateObj),
        isCurrentMonth: true,
      });
    }

    // Days from next month to fill grid to multiple of 7
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const dateObj = new Date(year, month + 1, i);
      grid.push({
        dayNum: i,
        dateKey: formatDateKey(dateObj),
        isCurrentMonth: false,
      });
    }

    return grid;
  };

  // Submit appointment (Supports edit and create)
  const handleCreateAppointment = async () => {
    if (!message.trim() || !startTime) {
      Alert.alert('Info', t.errorFill);
      return;
    }

    const startStr = `${pad(startTime.getHours())}:${pad(startTime.getMinutes())}`;
    let endStr: string | null = null;

    if (endTime) {
      if (endTime.getHours() < startTime.getHours() || 
         (endTime.getHours() === startTime.getHours() && endTime.getMinutes() <= startTime.getMinutes())) {
        Alert.alert('Info', t.errorTime);
        return;
      }
      endStr = `${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`;
    }

    if (editingEventId !== null) {
      // For editing: remove the old one first, then add the updated one
      await removeEvent(editingEventId);
    }

    await addEvent(selectedDay, startStr, endStr, message);

    // Reset Form
    setMessage('');
    setStartTime(null);
    setEndTime(null);
    const today = new Date();
    setSelectedDay(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    setEditingEventId(null);
    setIsHourlyView(false);
  };

  // Click on existing event to edit
  const handleEditEvent = (ev: any) => {
    setEditingEventId(ev.id);
    setMessage(ev.message);
    setStartTime(parseTimeToDate(ev.start_time));
    if (ev.end_time) {
      setEndTime(parseTimeToDate(ev.end_time));
    } else {
      setEndTime(null);
    }
    setSelectedDay(ev.date);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  // Click on empty hour row to start appointment Creation
  const handleEmptyHourClick = (hour: number) => {
    setEditingEventId(null);
    setMessage('');
    const start = new Date();
    start.setHours(hour, 0, 0, 0);
    setStartTime(start);
    const end = new Date();
    end.setHours(hour + 1, 0, 0, 0);
    setEndTime(end);
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const getEventsForDay = (dateKey: string) => {
    return events.filter(e => e.date === dateKey);
  };

  const currentYearStr = currentDate.getFullYear();
  const currentMonthStr = t.months[currentDate.getMonth()];

  const gridDays = getDaysGrid();

  // Selected Day date components
  const selectedDayDate = new Date(selectedDay + 'T00:00:00');
  const selectedDayLabel = `${selectedDayDate.getDate()} ${t.months[selectedDayDate.getMonth()]}`;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
      {/* CARD HEADER TITLE */}
      <View style={styles.cardHeaderTitle}>
        <IconSymbol name="calendar" size={20} color={colors.primary} />
        <Text style={[styles.cardTitleText, { color: colors.primary }]}>
          {lang === 'es' ? 'CALENDARIO PRIVADO (SOLO LOCAL)' : 'PRIVATE CALENDAR (LOCAL ONLY)'}
        </Text>
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        {!isHourlyView ? (
          <>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <IconSymbol name="chevron.left" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {currentMonthStr} {currentYearStr}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <IconSymbol name="chevron.right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: colors.textPrimary, flex: 1 }]}>
              📅 {selectedDayLabel}
            </Text>
            <TouchableOpacity onPress={() => setIsHourlyView(false)} style={styles.closeButton}>
              <IconSymbol name="xmark" size={18} color={colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* BODY CONTENT */}
      {!isHourlyView ? (
        <View style={styles.monthContainer}>
          {/* Weekdays */}
          <View style={styles.weekdaysHeader}>
            {t.days.map((d, index) => (
              <Text key={index} style={[styles.weekdayText, { color: colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {gridDays.map((item, index) => {
              const dayEvents = getEventsForDay(item.dateKey);
              const isSelected = selectedDay === item.dateKey;
              const isToday = formatDateKey(new Date()) === item.dateKey;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    { borderColor: colors.border },
                    !item.isCurrentMonth && { opacity: 0.35 },
                    isSelected && { backgroundColor: colors.primary + '22', borderColor: colors.primary },
                    isToday && !isSelected && { backgroundColor: colors.secondary + '1A', borderWidth: 1.5, borderColor: colors.secondary }
                  ]}
                  onPress={() => {
                    setSelectedDay(item.dateKey);
                    setIsHourlyView(true);
                  }}
                >
                  <Text style={[
                    styles.dayNum, 
                    { color: isSelected ? colors.primary : (isToday ? colors.secondary : colors.textPrimary) },
                    isToday && { fontWeight: 'bold' }
                  ]}>
                    {item.dayNum}
                  </Text>
                  
                  {/* Event previews in cell */}
                  {dayEvents.length > 0 && (
                    <View style={styles.eventDotContainer}>
                      {dayEvents.slice(0, 1).map((ev, evIdx) => (
                        <Text key={evIdx} numberOfLines={1} style={[styles.tinyEventText, { color: colors.textSecondary }]}>
                          {ev.message}
                        </Text>
                      ))}
                      {dayEvents.length > 1 && (
                        <Text style={[styles.tinyEventText, { color: colors.secondary, fontSize: 8 }]}>
                          +{dayEvents.length - 1}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        /* Hourly View (Optimized layout - no blank lines, full width rows) */
        <ScrollView ref={scrollViewRef} style={styles.hourlyContainer} nestedScrollEnabled>
          {Array.from({ length: 24 }).map((_, hour) => {
            const timeLabel = format24hToAmPm(`${pad(hour)}:00`);
            const hourEvents = getEventsForDay(selectedDay).filter(e => {
              const [h] = e.start_time.split(':').map(Number);
              return h === hour;
            });

            return (
              <View key={hour} style={[styles.hourRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.hourLabel, { color: colors.textSecondary }]}>
                  {timeLabel}
                </Text>
                
                {hourEvents.length > 0 ? (
                  <View style={styles.hourContent}>
                    {hourEvents.map((ev) => (
                      <TouchableOpacity 
                        key={ev.id} 
                        style={styles.eventBlock}
                        onPress={() => handleEditEvent(ev)}
                      >
                        <Text numberOfLines={1} style={[styles.eventMessageText, { color: colors.textPrimary }]}>
                          {ev.message} <Text style={{ fontSize: 10, color: colors.textSecondary }}>({format24hToAmPm(ev.start_time)}{ev.end_time ? ` - ${format24hToAmPm(ev.end_time)}` : ''})</Text>
                        </Text>
                        <TouchableOpacity onPress={() => removeEvent(ev.id)} style={styles.deleteEventButton}>
                          <IconSymbol name="trash.fill" size={13} color={colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.hourContentEmpty} 
                    onPress={() => handleEmptyHourClick(hour)}
                  >
                    <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                      {t.noEvents}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* FORM SECTION */}
      <View style={[styles.form, { borderTopColor: colors.border }]}>
        <TextInput
          ref={messageInputRef}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder={t.msgPlaceholder}
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
        />

        <View style={styles.timeRow}>
          {/* Day Button (Left) */}
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              { borderColor: colors.border, backgroundColor: colors.surface }
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
              📅 {t.dayBtn}: {selectedDayLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start / End Time Row (Right buttons next to each other) */}
        <View style={styles.timeRow}>
          {/* Start Time Button */}
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              { borderColor: colors.border, backgroundColor: startTime ? colors.primary + '22' : colors.surface }
            ]}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
              ⏰ {t.startBtn}: {startTime ? formatTimeObjectToAmPm(startTime) : '--:--'}
            </Text>
          </TouchableOpacity>

          {/* End Time Button */}
          <TouchableOpacity 
            style={[
              styles.timeButton, 
              { borderColor: colors.border, backgroundColor: endTime ? colors.primary + '22' : colors.surface }
            ]}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: 'bold' }}>
              ⏰ {t.endBtn}: {endTime ? formatTimeObjectToAmPm(endTime) : '--:--'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDayDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const dateKey = formatDateKey(selectedDate);
                setSelectedDay(dateKey);
                // Adjust current calendar grid focus month
                setCurrentDate(selectedDate);
              }
            }}
          />
        )}

        {showStartPicker && (
          <DateTimePicker
            value={startTime || new Date()}
            mode="time"
            is24Hour={false} // Use AM/PM format
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartPicker(false);
              if (selectedDate) {
                setStartTime(selectedDate);
              }
            }}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={endTime || startTime || new Date()}
            mode="time"
            is24Hour={false} // Use AM/PM format
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndPicker(false);
              if (selectedDate) {
                setEndTime(selectedDate);
              }
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.createButtonSubmit, { backgroundColor: colors.primary, opacity: message.trim() && startTime ? 1 : 0.6 }]}
          onPress={handleCreateAppointment}
        >
          <Text style={styles.createButtonText}>
            {editingEventId !== null ? t.saveApp : t.createApp}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    width: '100%',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  navButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  monthContainer: {
    marginBottom: 10,
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1.35,
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dayNum: {
    fontSize: 11,
    fontWeight: '500',
  },
  eventDotContainer: {
    width: '100%',
    marginTop: 0,
    alignItems: 'center',
  },
  tinyEventText: {
    fontSize: 7,
    lineHeight: 8,
    width: '100%',
    textAlign: 'center',
  },
  hourlyContainer: {
    maxHeight: 180,
    marginBottom: 5,
  },
  hourRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    alignItems: 'center',
    height: 40,
  },
  hourLabel: {
    width: 75,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  hourContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hourContentEmpty: {
    flex: 1,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  eventBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 1,
  },
  eventMessageText: {
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  deleteEventButton: {
    padding: 4,
  },
  noEventsText: {
    fontSize: 10,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  form: {
    borderTopWidth: 0.5,
    paddingTop: 10,
    marginTop: 5,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  timeButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonSubmit: {
    width: '100%',
    height: 46,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
