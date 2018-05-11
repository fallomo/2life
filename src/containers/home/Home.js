import React, { Component } from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  FlatList,
  Alert,
  DeviceEventEmitter
} from 'react-native'
import { View } from 'react-native-animatable'
import { CalendarList } from '../../components/react-native-calendars/src'
import { Actions } from 'react-native-router-flux'
import { connect } from 'react-redux'

import Container from '../../components/Container'
import TextPingFang from '../../components/TextPingFang'
import Diary from './Diary'

import Storage from '../../common/storage'
import {
  WIDTH,
  HEIGHT,
  getResponsiveWidth,
  getResponsiveHeight
} from '../../common/styles'

import {
  getMonth,
  getFormDay,
  getLocation,
  getWeather,
  diaryClassify,
  getWeatherDesc,
  updateUser
} from '../../common/util'

import { SCENE_NEW_DIARY } from '../../constants/scene'

import HttpUtils from '../../network/HttpUtils'
import { NOTES, USERS } from '../../network/Urls'

const URL_list = NOTES.list

function mapStateToProps(state) {
  return {
    user: state.user,
    partner: state.partner
  }
}

@connect(mapStateToProps)
export default class Home extends Component {

  state = {
    year: new Date().getFullYear(),
    month: getMonth(new Date().getMonth()),
    day: new Date().getDate(),
    showCalendar: false,
    weather_text: '你在的地方一定是晴天吧',
    weather_icon: require('../../../res/images/home/icon_sunny.png'),
    diaryList: [],
    filterDiaryList: [],
    markedDates: {},
    showDayTip: false,
    showWeatherTip: false,
    showWeatherFlag: false,
    showMe: true,
    showWeather: true
  }

  async componentDidMount() {
    this._showTips()
    this._getWeather()
    this._fetchDiary()

    DeviceEventEmitter.addListener('flash_note', () => this._fetchDiary())
  }

  async _fetchDiary() {
    const res = await HttpUtils.get(URL_list)
    if (res.code === 0) {
      const { partner, recommend, user } = res.data
      let diaryList = [...partner, ...user]
      // 判断是否空对象
      if (recommend.id) diaryList.push(recommend)
      diaryList.sort((a, b) => b.date - a.date)
      diaryList = diaryClassify(diaryList, 'date')

      let markedDates = {}
      const boy = { key: 'boy', color: '#4590F8'}
      const girl = { key: 'girl', color: 'pink' }
      const otherBoy = { key: 'otherBoy', color: '#2DC3A6' }
      const otherGirl = { key: 'otherGirl', color: '#F83AC1' }

      diaryList.forEach(dayDiary => {
        markedDates[getFormDay(dayDiary[0].date)] = { dots: [] }
        let hasBoyDiary = false
        let hasGirlDiary = false
        let hasOtherBoyDiary = false
        let hasOtherGirlDiary = false

        dayDiary.forEach(diary => {
          if ((diary.user_id === this.props.user.id) && (this.props.user.sex === 0)) {
            hasBoyDiary = true
          }
          if ((diary.user_id === this.props.user.id) && (this.props.user.sex === 1)) {
            hasGirlDiary = true
          }
          if ((diary.user_id !== this.props.user.id) && (this.props.partner.sex === 0)) {
            hasOtherBoyDiary = true
          }
          if ((diary.user_id !== this.props.user.id) && (this.props.partner.sex === 1)) {
            hasOtherGirlDiary = true
          }
        })

        if (hasBoyDiary) markedDates[getFormDay(dayDiary[0].date)].dots.push(boy)
        if (hasGirlDiary) markedDates[getFormDay(dayDiary[0].date)].dots.push(girl)
        if (hasOtherBoyDiary) markedDates[getFormDay(dayDiary[0].date)].dots.push(otherBoy)
        if (hasOtherGirlDiary) markedDates[getFormDay(dayDiary[0].date)].dots.push(otherGirl)
      })

      this.setState({
        diaryList,
        markedDates,
        filterDiaryList: diaryList
      })
    }
  }

  _updateUser() {
    if (this.props.user.total_notes && this.props.user.status === 502) {
      updateUser(this.props.user, {status: 101})
    }
  }

  async _showTips() {
    const firstUse = await Storage.get('firstUse', true)
    if (firstUse) {
      this.setState({
        showDayTip: true,
        showWeatherTip: false,
      })
    } else {
      this.setState({
        showWeatherFlag: true
      })
    }
    Storage.set('firstUse', false)
  }

  async _getWeather() {
    navigator.geolocation.getCurrentPosition(async res => {
      try {
        const { latitude, longitude } = res.coords

        //更新用户经纬度
        await updateUser(this.props.user, {latitude, longitude})
        this._updateUser()

        // 获取用户地理位置和天气信息
        const location = await getLocation(longitude, latitude)
        // const location = await getLocation(117.28972256,31.8572069484)
        const weather = await getWeather(location.city)
        console.log(weather)
        const { weather_text, weather_icon } = getWeatherDesc(weather)
        this.setState({ weather_text, weather_icon})
      } catch (e) {
        this.setState({
          weather_text: '你在的地方一定是晴天吧',
          weather_icon: require('../../../res/images/home/icon_sunny.png'),
        })
        
      }
    })
  }

  async onDayPress(day) {
    // let markedDates = this.state.markedDates
    // for (let date in markedDates) {
    //   if (date === day.dateString) {
    //     markedDates[date].selected = true
    //   } else {
    //     markedDates[date].selected = false
    //   }
    // } 
    const filterDiaryList = this.state.diaryList.filter(dayDiary => dayDiary[0].formDate === day.dateString)
    this.setState({ markedDates, filterDiaryList })
  }

  async setDate(months) {
    await 0
    this.setState({
      month: getMonth(months[0].month - 1),
      year: months[0].year
    })
  }

  tri() {
    if (this.state.showCalendar) {
      return <Image style={styles.img_tri} source={require('../../../res/images/home/icon_dropup.png')}/>
    } else {
      return <Image style={styles.img_tri} source={require('../../../res/images/home/icon_dropdown.png')}/>
    }
  }

  async exchangeWeather() {
    this.setState({ showWeatherTip: false })

    if (!this.props.partner.id) return

    if (this.state.showMe) {
      const { latitude, longitude } = this.props.partner
      const location = await getLocation(longitude, latitude)
      // const location = await getLocation(113.387061, 23.053829)
      const weather = await getWeather(location.city)
      const { weather_text, weather_icon } = getWeatherDesc(weather)
      this.setState({ weather_text, weather_icon, showMe: false, showWeather: true })
    } else {
      this._getWeather()
      this.setState({
        showMe: true,
        showWeather: true
      })
    }
  }

  async exchangeWM() {
    let user = this.props.user
    let partner = this.props.partner
    let mode_icon, mode_text
    
    if (this.state.showMe) {
      if (this.state.showWeather) {
        mode_text = `${user.mode ? user.mode : 0} 情绪值`
        if (user.mode === 0) mode_icon = require('../../../res/images/home/icon_very_sad.png')
        if (user.mode === 25) mode_icon = require('../../../res/images/home/icon_sad.png')
        if (user.mode === 50) mode_icon = require('../../../res/images/home/icon_normal.png')
        if (user.mode === 75) mode_icon = require('../../../res/images/home/icon_happy.png')
        if (user.mode === 100) mode_icon = require('../../../res/images/home/icon_very_happy.png')
        this.setState({
          weather_text: mode_text,
          weather_icon: mode_icon,
          showMe: true,
          showWeather: false
        })
      } else {
        this._getWeather()
        this.setState({
          showMe: true,
          showWeather: true
        })
      }
    } else {
      if (this.state.showWeather) {
        mode_text = `${partner.mode ? partner.mode : 0} 情绪值`
        if (partner.mode === 0) mode_icon = require('../../../res/images/home/icon_very_sad.png')
        if (partner.mode === 25) mode_icon = require('../../../res/images/home/icon_sad.png')
        if (partner.mode === 50) mode_icon = require('../../../res/images/home/icon_normal.png')
        if (partner.mode === 75) mode_icon = require('../../../res/images/home/icon_happy.png')
        if (partner.mode === 100) mode_icon = require('../../../res/images/home/icon_very_happy.png')
        this.setState({
          weather_text: mode_text,
          weather_icon: mode_icon,
          showMe: false,
          showWeather: false
        })
      } else {
        const { latitude, longitude } = partner
        const location = await getLocation(longitude, latitude)
        // const location = await getLocation(113.387061, 23.053829)
        const weather = await getWeather(location.city)
        const { weather_text, weather_icon } = getWeatherDesc(weather)
        this.setState({ weather_text, weather_icon, showMe: false, showWeather: true })
      }
    }
  }

  _renderItem({ item }) {
    return ( <Diary data={item}/> )
  }

  _emptyDiary() {
    return (
      <View style={styles.none_container}>
        <TextPingFang style={styles.text_none}>空空如也，{'\n'}来写一篇日记吧～</TextPingFang>
      </View>
    )
  }

  _listFooter() {
    return (
      <View style={[styles.list_footer, { display: this.state.diaryList.length === 0 ? 'none' : 'flex' }]}/>
    )
  }

  render() {

    return (
      <Container>
        <View style={styles.header_container}>
          <TouchableOpacity
            style={styles.header_left}
            activeOpacity={1}
            onPress={() => this.setState({ showCalendar: !this.state.showCalendar })}
          >
            <TextPingFang style={styles.text_month}>{this.state.month}</TextPingFang>
            <TextPingFang style={styles.text_year}>{this.state.year}</TextPingFang>
            {this.tri()}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.header_right_container}
            onPress={() => this.setState({
              filterDiaryList: this.state.diaryList,
              showDayTip: false,
              showWeatherTip: !this.state.showWeatherFlag,
              showWeatherFlag: true
            })}
          >
            <ImageBackground style={styles.header_right} source={require('../../../res/images/home/icon_calendar.png')}>
              <TextPingFang style={styles.text_day}>{this.state.day}</TextPingFang>
            </ImageBackground>
          </TouchableOpacity>

          <View
            style={[styles.tip_container, { display: this.state.showDayTip ? 'flex' : 'none' }]}
            animation='bounceIn'
          >
            <TextPingFang style={styles.text_tip}>点击这里回到当天日期哦</TextPingFang>
            <View style={styles.triangle}/>
          </View>
        </View>

        <CalendarList
          horizontal={true}
          pagingEnabled={true}
          style={[styles.calendar, { display: this.state.showCalendar ? 'flex' : 'none' }]}
          theme={{
            calendarBackground: 'rgb(250,250,250)',
            textDayFontSize: 14,
          }}
          maxDate={new Date()}
          onDayPress={day => this.onDayPress(day)}
          onVisibleMonthsChange={months => this.setDate(months)}
          markedDates={this.state.markedDates}
          markingType={'multi-dot'}
        />

        <View style={styles.weather}>
          <View style={styles.weather_inner}>
            <TouchableOpacity
              style={styles.inner_left}
              onPress={() => this.exchangeWM()}
            >
              <Image style={styles.weather_icon} source={this.state.weather_icon}/>
              <TextPingFang
                style={[styles.text_weather, { color: this.state.showMe ? '#aaa' : '#000' }]}>{this.state.weather_text}</TextPingFang>
            </TouchableOpacity>

            <TouchableOpacity style={styles.weather_exchange} onPress={() => this.exchangeWeather()}>
              <Image source={require('../../../res/images/common/icon_exchange.png')}/>
            </TouchableOpacity>
          </View>

          <View
            style={[styles.tip_container, { display: this.state.showWeatherTip ? 'flex' : 'none' }]}
            animation='bounceIn'
          >
            <TextPingFang style={styles.text_tip}>点击这里可以看到对方天气哦</TextPingFang>
            <View style={styles.triangle}/>
          </View>
        </View>

        <FlatList
          style={styles.diary_container}
          data={this.state.filterDiaryList}
          extraData={this.state}
          renderItem={this._renderItem}
          ListEmptyComponent={() => this._emptyDiary()}
          ListFooterComponent={() => this._listFooter()}
        />

        <TouchableOpacity
          style={styles.new_diary}
          onPress={() => Actions.jump(SCENE_NEW_DIARY)}
        >
          <Image source={require('../../../res/images/home/icon_new_diary.png')}/>
        </TouchableOpacity>
      </Container>
    )
  }
}

const styles = StyleSheet.create({
  header_container: {
    width: WIDTH,
    flexDirection: 'row',
    paddingTop: getResponsiveHeight(28),
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  header_left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: getResponsiveWidth(72)
  },
  text_month: {
    color: '#444',
    fontSize: 34
  },
  text_year: {
    color: '#000',
    fontSize: 34,
    marginLeft: getResponsiveWidth(4)
  },
  img_tri: {
    marginLeft: getResponsiveWidth(6)
  },
  header_right_container: {
    position: 'absolute',
    right: getResponsiveWidth(20),
    bottom: getResponsiveWidth(10),
  },
  header_right: {
    width: getResponsiveWidth(25),
    height: getResponsiveWidth(25)
  },
  text_day: {
    textAlign: 'center',
    paddingTop: getResponsiveWidth(9),
    color: '#444',
    fontSize: 10,
  },
  tip_container: {
    width: getResponsiveWidth(164),
    height: getResponsiveWidth(37),
    position: 'absolute',
    right: getResponsiveWidth(8),
    bottom: getResponsiveWidth(-35),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2DC3A6',
    borderRadius: getResponsiveWidth(8),
    zIndex: 10
  },
  triangle: {
    position: 'absolute',
    top: getResponsiveWidth(-16),
    right: getResponsiveWidth(16),
    borderBottomWidth: 8,
    borderBottomColor: '#2DC3A6',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
  },
  text_tip: {
    color: '#fff',
    fontSize: 12
  },
  calendar: {
    width: WIDTH,
    height: (() => {
      if (HEIGHT === 568) return 280 // iphone 5/5s/SE
      if (HEIGHT === 667) return 190 // iphone 6/7/8
      if (HEIGHT === 736) return 335 // iphone 6P/7P/8P
      if (HEIGHT === 812) return 350 // iphone X
    })()
  },
  weather: {
    width: WIDTH,
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    zIndex: -10
  },
  weather_inner: {
    height: getResponsiveHeight(60),
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: getResponsiveWidth(1),
    borderBottomColor: '#f1f1f1',
  },
  inner_left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // weather_icon: {
  // },
  text_weather: {
    marginLeft: getResponsiveWidth(24),
    color: '#aaa',
    fontSize: 14,
  },
  weather_exchange: {
    position: 'absolute',
    right: 0,
  },
  diary_container: {
    height: (() => {
      if (HEIGHT === 568) return 190 // iphone 5/5s/SE
      if (HEIGHT === 667) return 190 // iphone 6/7/8
      if (HEIGHT === 736) return 425 // iphone 6P/7P/8P
      if (HEIGHT === 812) return 500 // iphone X
    })(),
    width: WIDTH,
    paddingLeft: getResponsiveWidth(24),
    paddingRight: getResponsiveWidth(24),
    backgroundColor: 'transparent',
    zIndex: -10
  },
  none_container: {
    alignItems: 'center',
    paddingTop: getResponsiveHeight(150),
    backgroundColor: 'transparent',
    zIndex: -10
  },
  text_none: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center'
  },
  list_footer: {
    width: WIDTH,
    height: getResponsiveHeight(50),
    backgroundColor: '#fff',
    zIndex: -10
  },
  new_diary: {
    position: 'absolute',
    bottom: getResponsiveHeight(65),
    right: getResponsiveWidth(16),
  }
})