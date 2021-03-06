import React from 'react'
import {
  AppRegistry,
  StyleSheet,
  asset,
  Pano,
  Sound,
  MediaPlayerState,
  Text,
  View,
  VrButton
} from 'react-vr'

import axios from 'axios'

const FLICKR_API_BASE_URL = 'https://api.flickr.com/services/rest/'
const FLICKR_API_KEY = 'fc6a98fd8b142eec89de8eb42e1fba89'

const $styleTpl = {
  palette: {
    blue: '#0000d2',
    blueTrans: 'rgba(0, 0, 210, 0.7)',
    purple: '#0000d2',
    purpleTrans: 'rgba(61, 0, 144, 0.7)',
    black: '#212121',
    blackTrans: 'rgba(10, 10, 10, 0.7)',
    white: '#fff',
    whiteTrans: 'rgba(255, 255, 255, 0.7)',
    green: '#009038',
    greenTrans: 'rgba(0, 144, 56, 0.7)',
    red: '#d70000',
    redTrans: 'rgba(215, 0, 0, 0.7)',
    orange: '#ff6600',
    orangeTrans: 'rgba(255, 102, 0, 0.7)',
    yellow: '#f5f000',
    yellowTrans: 'rgba(245, 240, 0, 0.7)'
  },
  textCenter: {
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  btn: {
    backgroundColor: 'rgba(10, 10, 10, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 0.025,
    margin: 0.03
  },
  rowBox: {
    flex: 1,
    flexDirection: 'row'
  },
  columnBox: {
    flex: 1,
    flexDirection: 'column'
  },
  simpleBox: {
    borderRadius: 0.07,
    paddingLeft: 0.07,
    paddingRight: 0.07,
    paddingBottom: 0.03,
    paddingTop: 0.03,
    maxWidth: 1.7,
    alignItems: 'stretch'
  }
}
const $styles = StyleSheet.create({
  introBox: StyleSheet.flatten([$styleTpl.columnBox, {
    backgroundColor: '#777879',
    paddingLeft: 0.2,
    paddingRight: 0.2,
    // width: 2,
    alignItems: 'stretch'
  }]),
  legendBox: StyleSheet.flatten([$styleTpl.columnBox, $styleTpl.simpleBox, {
    backgroundColor: $styleTpl.palette.whiteTrans
  }]),
  notiBox: StyleSheet.flatten([$styleTpl.columnBox, $styleTpl.simpleBox, {
    backgroundColor: $styleTpl.palette.blue
  }]),
  verboseBox: StyleSheet.flatten([$styleTpl.simpleBox, { backgroundColor: $styleTpl.palette.black }]),
  rowBox: $styleTpl.rowBox,
  columnBox: $styleTpl.columnBox,
  rowBoxCenter: StyleSheet.flatten([$styleTpl.rowBox, { justifyContent: 'center' }]),
  textCenter: $styleTpl.textCenter,
  btn: $styleTpl.btn,
  btnRounded: StyleSheet.flatten([$styleTpl.btn, {
    borderRadius: 0.5,
    width: 0.17,
    height: 0.17
  }]),
  btnText: StyleSheet.flatten([$styleTpl.textCenter, { fontWeight: '600' }])
})

export default class vr360expo extends React.Component {
  constructor () {
    super()

    this.state = {
      btnPlayColor: $styleTpl.palette.orangeTrans,
      btnHomeColor: $styleTpl.btn.backgroundColor,
      btnSoundColor: $styleTpl.btn.backgroundColor,
      btnInfoColor: $styleTpl.palette.blueTrans,
      notiBoxColor: $styleTpl.palette.black,
      isIntroVisible: true,
      isNotiVisible: false,
      isLegendVisible: true,
      isInitialLoading: true,
      isSoundPlaying: true,
      notiMessage: 'loading state ...',
      lengendTitle: 'welcome, say hello to the world!',
      lengendContent: 'Use these side buttons to navigate through awesome pictures, published by awesome people. Dragging around a 360° picture with your mouse on the panoramic page.',
      currentPanoSource: asset('chess-world.jpg'),
      nextPanoImage: {},
      soundState: new MediaPlayerState({ autoPlay: true })
    }
    this._panoGallery = null
    this._cachedPanoSources = []
  }

  // use to show notifcation box depending of message's type
  _notify (msg, type) {
    switch (type) {
      case 'error': this.state.notiBoxColor = $styleTpl.palette.red
        break
      case 'warning': this.state.notiBoxColor = $styleTpl.palette.orange
        break
      case 'info': this.state.notiBoxColor = $styleTpl.palette.blue
        break
      default: this.state.notiBoxColor = $styleTpl.palette.black
    }

    this.setState({notiMessage: msg})
    if (!this.state.isNotiVisible) this.setState({ isNotiVisible: true })
  }

  // use to hide notification box
  _hideNotifier () {
    if (this.state.isNotiVisible) this.setState({ isNotiVisible: false })
  }

  // use to randomly fetch equirectangular images informations to initialize the gallery
  async _fetchPanoImages () {
    this._notify('loading panoramic gallery ...')

    try {
      let reqParams = {
        method: 'flickr.photos.search',
        api_key: FLICKR_API_KEY,
        tags: 'equirectangular, equirectangle',
        accuracy: 1,
        content_type: 1,
        per_page: 500,
        format: 'json',
        extras: 'license, owner_name, last_update',
        nojsoncallback: 1
      }
      let response = await axios.get(FLICKR_API_BASE_URL, {
        params: reqParams
      })

      if (response.data.stat === 'ok') {
        if (response.data.photos.total >= 1) {
          /* There can be large result with more than one page.
           * To offert large exploration, a result page can be randomly target.
           * This to avoid having same pictures each time from first result page.
           * for pages >= 3, last page can have less result, so it will not be considered.
           */
          let luckyPage = 1
          let photoPages = response.data.photos.pages
          if (photoPages >= 3 && (luckyPage = Math.floor(Math.random() * photoPages - 1)) !== 1) {
            reqParams.page = luckyPage
            response = await axios.get(FLICKR_API_BASE_URL, {
              params: reqParams
            })
          }
          this._panoGallery = response.data.photos
          this._fetchRandomPanoImageURI() // preload the futur equirectangular image to show
          this._notify('panoramic gallery loaded, you can now start!', 'info')
        } else {
          console.warn('FlickrAPI:search: Humm, empty data fetched!')
          this._notify('Humm, empty data fetched, please try again!', 'warning')
        }
      } else {
        console.error('FlickrAPI:search: Oops, request error! ', response.data.message)
        this._notify('Oops, fetching gallery error, please try again!', 'error')
      }
      console.log(response.data)
    } catch (err) {
      console.error('FlickrAPI:search: Oops, connexion error! ', err)
      this._notify('Oops, connexion error!', 'error')
    }
  }

  // use to randomly get current equirectangular image's uri to show and preload next one
  async _fetchRandomPanoImageURI () {
    let panoGallery = this._panoGallery
    this._notify('loading next image ...')

    if (panoGallery) {
      // use waiting preloaded equirectangular image
      if (Object.keys(this.state.nextPanoImage).length !== 0) {
        this.setState({ currentPanoSource: this.state.nextPanoImage.source })
        this.setState({ lengendTitle: this.state.nextPanoImage.title })
        this.setState({ lengendContent: this.state.nextPanoImage.content })
      }
      // try to get next random image to preload and cache
      let luckyPic = Math.floor(Math.random() * panoGallery.photo.length)
      let catchedPanoSource = this._cachedPanoSources.find((source) => source.index === luckyPic)

      if (!catchedPanoSource) {
        let luckyPicInfo = panoGallery.photo[luckyPic]
        try {
          let response = await axios.get(FLICKR_API_BASE_URL, {
            params: {
              method: 'flickr.photos.getSizes',
              api_key: FLICKR_API_KEY,
              photo_id: luckyPicInfo.id,
              format: 'json',
              nojsoncallback: 1
            }
          })

          if (response.data.stat === 'ok') {
            let luckyPicSizes = response.data.sizes
            // get largest image's size (can be very big for some and then timemore loading)
            // That said `three.js` seems to resize automatically big image (width > 8192px)
            let luckyPicLink = luckyPicSizes.size[luckyPicSizes.size.length - 1].source
            // next equirectangular image is preloaded for better latency performation when will become current
            this.setState({ nextPanoImage: {
              source: {uri: luckyPicLink},
              title: `from flikr.com by "${luckyPicInfo.ownername}"`,
              content: luckyPicInfo.title
            }})
            this._cachedPanoSources.push({ index: luckyPic, uri: luckyPicLink })
          } else {
            console.error('FlickrAPI:getSizes: Oops, request error! ', response.data.message)
            this._notify('Oops, fetching picture error, please try again!', 'error')
          }
          console.log(response.data)
        } catch (err) {
          console.error('FlickrAPI:getSizes: Oops, connexion error! ', err)
          this._notify('Oops, connexion error!', 'error')
        }
      } else {
        this.setState({ currentPanoSource: { uri: catchedPanoSource.uri } })
      }
    } else this._notify('Hola, waiting gallery to be loaded, maybe connexion issue!', 'warning')
  }

  _statePanoLoaded () {
    if (!this.state.isInitialLoading) {
      this._hideNotifier()
    } else this.setState({isInitialLoading: false})
  }

  _changeSoundStatus () {
    if (this.state.isSoundPlaying) {
      this.state.soundState.pause()
      this.setState({ isSoundPlaying: false })
    } else {
      this.state.soundState.play()
      this.setState({ isSoundPlaying: true })
    }
  }

  _displayHomePano () {
    this.setState({ nextPanoImage: {} })
    this._fetchPanoImages()
    if (!this.state.isIntroVisible) this.setState({ isIntroVisible: true })
    this.setState({ btnHomeColor: $styleTpl.palette.green })
    this.setState({ isInitialLoading: true })
    this.setState({ currentPanoSource: asset('chess-world.jpg') })
    this.setState({ lengendTitle: 'say hello to the world!' })
    this.setState({ lengendContent: 'use these side buttons to navigate through awesome pictures, published by awesome people.' })
  }

  _displayNewPano () {
    this._fetchRandomPanoImageURI()
    this.setState({ btnPlayColor: $styleTpl.palette.green })
    if (this.state.isIntroVisible) this.setState({ isIntroVisible: false })
  }

  _manageInfoBox () {
    this._hideNotifier()
    this.setState({ isLegendVisible: !this.state.isLegendVisible })
  }

  componentWillMount () {
    this._fetchPanoImages()
  }

  render () {
    return (
      <View>
        <Sound source={asset('no-time.mp3')} playerState={this.state.soundState} loop />
        <Pano source={this.state.currentPanoSource} onLoadEnd={() => { this._statePanoLoaded() }} />
        {/* below  pano is just used for futur equirectangular image preloading purpose */}
        <Pano style={{display: 'none'}} source={this.state.nextPanoImage.source || this.state.currentPanoSource} />
        <View style={[$styles.introBox, {
          transform: [{ translate: [0, 0, -3.5] }],
          layoutOrigin: [0.5, 0.5],
          display: this.state.isIntroVisible ? 'flex' : 'none'
        }]}>
          <Text style={[$styles.textCenter, {
            fontSize: 0.3,
            fontWeight: '400'
          }]}>
            welcome to vr360expo
          </Text>
          <Text style={[$styles.textCenter, {
            fontSize: 0.2
          }]}>
            &gt; explore panoramic pictures in virtual reality mode !
          </Text>
          <Text style={[$styles.textCenter, {
            fontSize: 0.15,
            fontWeight: '400'
          }]}>
            &lt; made with love by "weloobe" &gt;
          </Text>
        </View>
        <View style={[$styles.rowBoxCenter, {
          layoutOrigin: [0.5, 0.5],
          width: 3,
          // backgroundColor: "#000",
          transform: [{ translate: [0.5, 0, -2.1] }]
        }]}>
          <VrButton
            style={[$styles.btnRounded, {
              backgroundColor: this.state.btnHomeColor
            }]}
            onEnter={() => this.setState({ btnHomeColor: $styleTpl.palette.purpleTrans })}
            onExit={() => this.setState({ btnHomeColor: $styleTpl.btn.backgroundColor })}
            onClick={() => this._displayHomePano()}
          >
            <Text style={$styles.btnText}>
              H
            </Text>
          </VrButton>
          <VrButton
            style={[$styles.btnRounded, {
              backgroundColor: this.state.btnSoundColor
            }]}
            onEnter={() => this.setState({ btnSoundColor: $styleTpl.palette.purpleTrans })}
            onExit={() => this.setState({ btnSoundColor: $styleTpl.btn.backgroundColor })}
            onClick={() => this._changeSoundStatus()}
          >
            <Text style={$styles.btnText}>
              S
            </Text>
          </VrButton>
          <VrButton
            style={[$styles.btnRounded, {
              backgroundColor: this.state.btnPlayColor
            }]}
            onEnter={() => this.setState({ btnPlayColor: $styleTpl.palette.purpleTrans })}
            onExit={() => this.setState({ btnPlayColor: $styleTpl.palette.orangeTrans })}
            onClick={() => this._displayNewPano()}
          >
            <Text style={$styles.btnText}>
              &gt;
            </Text>
          </VrButton>
          <VrButton
            style={[$styles.btnRounded, {
              backgroundColor: this.state.btnInfoColor
            }]}
            onEnter={() => this.setState({ btnInfoColor: $styleTpl.palette.purpleTrans })}
            onExit={() => this.setState({ btnInfoColor: $styleTpl.palette.blueTrans })}
            onClick={() => this._manageInfoBox()}
          >
            <Text style={$styles.btnText}>
              i
            </Text>
          </VrButton>
          <View style={[$styles.columnBox]}>
            <View style={[$styles.notiBox, {
              display: this.state.isNotiVisible ? 'flex' : 'none',
              backgroundColor: this.state.notiBoxColor
            }]}>
              <Text style={{
                fontWeight: '400',
                fontSize: 0.08
              }}>
                {this.state.notiMessage}
              </Text>
            </View>
            <View style={[$styles.legendBox, {display: this.state.isLegendVisible ? 'flex' : 'none'}]}>
              <Text style={{
                color: $styleTpl.palette.blue,
                fontSize: 0.06
              }}>
                { this.state.lengendTitle }
              </Text>
              <Text numberOfLines={5} style={{
                color: $styleTpl.palette.black,
                fontSize: 0.07
              }}>
                &gt; { this.state.lengendContent }
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }
}

AppRegistry.registerComponent('vr360expo', () => vr360expo)
