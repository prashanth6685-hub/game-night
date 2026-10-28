var Fe=Object.create;var U=Object.defineProperty;var Ge=Object.getOwnPropertyDescriptor;var Ie=Object.getOwnPropertyNames;var Oe=Object.getPrototypeOf,je=Object.prototype.hasOwnProperty;var E=(e,n)=>()=>(n||e((n={exports:{}}).exports,n),n.exports);var Ve=(e,n,t,o)=>{if(n&&typeof n=="object"||typeof n=="function")for(let r of Ie(n))!je.call(e,r)&&r!==t&&U(e,r,{get:()=>n[r],enumerable:!(o=Ge(n,r))||o.enumerable});return e};var u=(e,n,t)=>(t=e!=null?Fe(Oe(e)):{},Ve(n||!e||!e.__esModule?U(t,"default",{value:e,enumerable:!0}):t,e));var ae=E(l=>{"use strict";var P=Symbol.for("react.element"),We=Symbol.for("react.portal"),Ye=Symbol.for("react.fragment"),$e=Symbol.for("react.strict_mode"),Je=Symbol.for("react.profiler"),Ue=Symbol.for("react.provider"),qe=Symbol.for("react.context"),ze=Symbol.for("react.forward_ref"),Ke=Symbol.for("react.suspense"),Qe=Symbol.for("react.memo"),Xe=Symbol.for("react.lazy"),q=Symbol.iterator;function Ze(e){return e===null||typeof e!="object"?null:(e=q&&e[q]||e["@@iterator"],typeof e=="function"?e:null)}var Q={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},X=Object.assign,Z={};function x(e,n,t){this.props=e,this.context=n,this.refs=Z,this.updater=t||Q}x.prototype.isReactComponent={};x.prototype.setState=function(e,n){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,n,"setState")};x.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function ee(){}ee.prototype=x.prototype;function F(e,n,t){this.props=e,this.context=n,this.refs=Z,this.updater=t||Q}var G=F.prototype=new ee;G.constructor=F;X(G,x.prototype);G.isPureReactComponent=!0;var z=Array.isArray,ne=Object.prototype.hasOwnProperty,I={current:null},te={key:!0,ref:!0,__self:!0,__source:!0};function oe(e,n,t){var o,r={},a=null,i=null;if(n!=null)for(o in n.ref!==void 0&&(i=n.ref),n.key!==void 0&&(a=""+n.key),n)ne.call(n,o)&&!te.hasOwnProperty(o)&&(r[o]=n[o]);var s=arguments.length-2;if(s===1)r.children=t;else if(1<s){for(var m=Array(s),d=0;d<s;d++)m[d]=arguments[d+2];r.children=m}if(e&&e.defaultProps)for(o in s=e.defaultProps,s)r[o]===void 0&&(r[o]=s[o]);return{$$typeof:P,type:e,key:a,ref:i,props:r,_owner:I.current}}function en(e,n){return{$$typeof:P,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}function O(e){return typeof e=="object"&&e!==null&&e.$$typeof===P}function nn(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(t){return n[t]})}var K=/\/+/g;function _(e,n){return typeof e=="object"&&e!==null&&e.key!=null?nn(""+e.key):n.toString(36)}function B(e,n,t,o,r){var a=typeof e;(a==="undefined"||a==="boolean")&&(e=null);var i=!1;if(e===null)i=!0;else switch(a){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case P:case We:i=!0}}if(i)return i=e,r=r(i),e=o===""?"."+_(i,0):o,z(r)?(t="",e!=null&&(t=e.replace(K,"$&/")+"/"),B(r,n,t,"",function(d){return d})):r!=null&&(O(r)&&(r=en(r,t+(!r.key||i&&i.key===r.key?"":(""+r.key).replace(K,"$&/")+"/")+e)),n.push(r)),1;if(i=0,o=o===""?".":o+":",z(e))for(var s=0;s<e.length;s++){a=e[s];var m=o+_(a,s);i+=B(a,n,t,m,r)}else if(m=Ze(e),typeof m=="function")for(e=m.call(e),s=0;!(a=e.next()).done;)a=a.value,m=o+_(a,s++),i+=B(a,n,t,m,r);else if(a==="object")throw n=String(e),Error("Objects are not valid as a React child (found: "+(n==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":n)+"). If you meant to render a collection of children, use an array instead.");return i}function L(e,n,t){if(e==null)return e;var o=[],r=0;return B(e,o,"","",function(a){return n.call(t,a,r++)}),o}function tn(e){if(e._status===-1){var n=e._result;n=n(),n.then(function(t){(e._status===0||e._status===-1)&&(e._status=1,e._result=t)},function(t){(e._status===0||e._status===-1)&&(e._status=2,e._result=t)}),e._status===-1&&(e._status=0,e._result=n)}if(e._status===1)return e._result.default;throw e._result}var p={current:null},M={transition:null},on={ReactCurrentDispatcher:p,ReactCurrentBatchConfig:M,ReactCurrentOwner:I};function re(){throw Error("act(...) is not supported in production builds of React.")}l.Children={map:L,forEach:function(e,n,t){L(e,function(){n.apply(this,arguments)},t)},count:function(e){var n=0;return L(e,function(){n++}),n},toArray:function(e){return L(e,function(n){return n})||[]},only:function(e){if(!O(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};l.Component=x;l.Fragment=Ye;l.Profiler=Je;l.PureComponent=F;l.StrictMode=$e;l.Suspense=Ke;l.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=on;l.act=re;l.cloneElement=function(e,n,t){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var o=X({},e.props),r=e.key,a=e.ref,i=e._owner;if(n!=null){if(n.ref!==void 0&&(a=n.ref,i=I.current),n.key!==void 0&&(r=""+n.key),e.type&&e.type.defaultProps)var s=e.type.defaultProps;for(m in n)ne.call(n,m)&&!te.hasOwnProperty(m)&&(o[m]=n[m]===void 0&&s!==void 0?s[m]:n[m])}var m=arguments.length-2;if(m===1)o.children=t;else if(1<m){s=Array(m);for(var d=0;d<m;d++)s[d]=arguments[d+2];o.children=s}return{$$typeof:P,type:e.type,key:r,ref:a,props:o,_owner:i}};l.createContext=function(e){return e={$$typeof:qe,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Ue,_context:e},e.Consumer=e};l.createElement=oe;l.createFactory=function(e){var n=oe.bind(null,e);return n.type=e,n};l.createRef=function(){return{current:null}};l.forwardRef=function(e){return{$$typeof:ze,render:e}};l.isValidElement=O;l.lazy=function(e){return{$$typeof:Xe,_payload:{_status:-1,_result:e},_init:tn}};l.memo=function(e,n){return{$$typeof:Qe,type:e,compare:n===void 0?null:n}};l.startTransition=function(e){var n=M.transition;M.transition={};try{e()}finally{M.transition=n}};l.unstable_act=re;l.useCallback=function(e,n){return p.current.useCallback(e,n)};l.useContext=function(e){return p.current.useContext(e)};l.useDebugValue=function(){};l.useDeferredValue=function(e){return p.current.useDeferredValue(e)};l.useEffect=function(e,n){return p.current.useEffect(e,n)};l.useId=function(){return p.current.useId()};l.useImperativeHandle=function(e,n,t){return p.current.useImperativeHandle(e,n,t)};l.useInsertionEffect=function(e,n){return p.current.useInsertionEffect(e,n)};l.useLayoutEffect=function(e,n){return p.current.useLayoutEffect(e,n)};l.useMemo=function(e,n){return p.current.useMemo(e,n)};l.useReducer=function(e,n,t){return p.current.useReducer(e,n,t)};l.useRef=function(e){return p.current.useRef(e)};l.useState=function(e){return p.current.useState(e)};l.useSyncExternalStore=function(e,n,t){return p.current.useSyncExternalStore(e,n,t)};l.useTransition=function(){return p.current.useTransition()};l.version="18.3.1"});var w=E((On,ie)=>{"use strict";ie.exports=ae()});var xe=E(A=>{"use strict";var vn=w(),wn=Symbol.for("react.element"),kn=Symbol.for("react.fragment"),Cn=Object.prototype.hasOwnProperty,Rn=vn.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,xn={key:!0,ref:!0,__self:!0,__source:!0};function Re(e,n,t){var o,r={},a=null,i=null;t!==void 0&&(a=""+t),n.key!==void 0&&(a=""+n.key),n.ref!==void 0&&(i=n.ref);for(o in n)Cn.call(n,o)&&!xn.hasOwnProperty(o)&&(r[o]=n[o]);if(e&&e.defaultProps)for(o in n=e.defaultProps,n)r[o]===void 0&&(r[o]=n[o]);return{$$typeof:wn,type:e,key:a,ref:i,props:r,_owner:Rn.current}}A.Fragment=kn;A.jsx=Re;A.jsxs=Re});var c=E((ft,Te)=>{"use strict";Te.exports=xe()});var f=u(w());var se={about:{body:"Game Night is a family-friendly collection of casual games. Play together on one device \u2014 online multiplayer is on the roadmap.",title:"About"},ads:{label:"Advertisement"},app:{name:"Game Night",tagline:"Pick a game. Gather around. Play."},common:{back:"Back",cancel:"Cancel",chooseAnother:"Choose Another Game",close:"Close",confirm:"Confirm",home:"Home",loading:"Loading\u2026",name:"Name",newGame:"New Game",no:"No",ok:"OK",playAgain:"Play Again",playersLabel:"Players",restart:"Restart",save:"Save",start:"Start",yes:"Yes",retry:"Try again",skipToContent:"Skip to main content"},errors:{generic:"Something went wrong. Please try again.",offline:"You appear to be offline.",gameLoad:"This game could not load. Tap Try Again to reload."},games:{chess:{desc:"The classic two-player strategy game.",name:"Chess"},"dumb-charades":{desc:"Act it out \u2014 movies, songs, people & more.",name:"Dumb Charades"},"snake-ladder":{desc:"Race to 100 \u2014 dodge snakes, climb ladders.",name:"Snake & Ladder"},tambola:{desc:"Classic Tambola / Housie number calling.",name:"Tambola"}},lobby:{comingSoon:"More games coming soon",playNow:"Play Now",players:"Players",subtitle:"Casual games for family & friends",title:"Choose a Game",unlimited:"{n}+"},nav:{about:"About",games:"Games",home:"Home",rooms:"Rooms",settings:"Settings"},results:{title:"Game Over",winner:"Winner"},rooms:{create:"Create Room",host:"Host",join:"Join Room",leave:"Leave Room",notReady:"Not Ready",onlineSoon:"Online multiplayer is coming soon \u2014 local rooms work today.",players:"Players",ready:"Ready",remove:"Remove",roomCode:"Room Code",selectGame:"Select Game",startGame:"Start Game",title:"Game Rooms",yourName:"Your Name"},settings:{animations:"Animations",appearance:"Appearance",language:"Language",off:"Off",on:"On",sound:"Sound",theme:"Theme",themeDark:"Dark",themeLight:"Light",themeSystem:"System",title:"Settings"}};var le={about:{body:"\u0C17\u0C47\u0C2E\u0C4D \u0C28\u0C48\u0C1F\u0C4D \u0C05\u0C28\u0C47\u0C26\u0C3F \u0C15\u0C41\u0C1F\u0C41\u0C02\u0C2C-\u0C38\u0C4D\u0C28\u0C47\u0C39\u0C2A\u0C42\u0C30\u0C4D\u0C35\u0C15 \u0C38\u0C30\u0C26\u0C3E \u0C06\u0C1F\u0C32 \u0C38\u0C47\u0C15\u0C30\u0C23. \u0C12\u0C15\u0C47 \u0C2A\u0C30\u0C3F\u0C15\u0C30\u0C02\u0C32\u0C4B \u0C15\u0C32\u0C3F\u0C38\u0C3F \u0C06\u0C21\u0C02\u0C21\u0C3F \u2014 \u0C06\u0C28\u0C4D\u200C\u0C32\u0C48\u0C28\u0C4D \u0C2E\u0C32\u0C4D\u0C1F\u0C40\u0C2A\u0C4D\u0C32\u0C47\u0C2F\u0C30\u0C4D \u0C30\u0C4B\u0C21\u0C4D\u200C\u0C2E\u0C4D\u0C2F\u0C3E\u0C2A\u0C4D\u200C\u0C32\u0C4B \u0C09\u0C02\u0C26\u0C3F.",title:"\u0C17\u0C41\u0C30\u0C3F\u0C02\u0C1A\u0C3F"},ads:{label:"\u0C2A\u0C4D\u0C30\u0C15\u0C1F\u0C28"},app:{name:"Game Night",tagline:"\u0C06\u0C1F\u0C28\u0C41 \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F. \u0C05\u0C02\u0C26\u0C30\u0C42 \u0C15\u0C32\u0C35\u0C02\u0C21\u0C3F. \u0C06\u0C21\u0C02\u0C21\u0C3F."},common:{back:"\u0C35\u0C46\u0C28\u0C41\u0C15\u0C15\u0C41",cancel:"\u0C30\u0C26\u0C4D\u0C26\u0C41",chooseAnother:"\u0C2E\u0C30\u0C4B \u0C06\u0C1F \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F",close:"\u0C2E\u0C42\u0C38\u0C3F\u0C35\u0C47\u0C2F\u0C3F",confirm:"\u0C28\u0C3F\u0C30\u0C4D\u0C27\u0C3E\u0C30\u0C3F\u0C02\u0C1A\u0C41",home:"\u0C39\u0C4B\u0C2E\u0C4D",loading:"\u0C32\u0C4B\u0C21\u0C4D \u0C05\u0C35\u0C41\u0C24\u0C4B\u0C02\u0C26\u0C3F\u2026",name:"\u0C2A\u0C47\u0C30\u0C41",newGame:"\u0C15\u0C4A\u0C24\u0C4D\u0C24 \u0C06\u0C1F",no:"\u0C15\u0C3E\u0C26\u0C41",ok:"\u0C38\u0C30\u0C47",playAgain:"\u0C2E\u0C33\u0C4D\u0C32\u0C40 \u0C06\u0C21\u0C02\u0C21\u0C3F",playersLabel:"\u0C06\u0C1F\u0C17\u0C3E\u0C33\u0C4D\u0C32\u0C41",restart:"\u0C2A\u0C41\u0C28\u0C03\u0C2A\u0C4D\u0C30\u0C3E\u0C30\u0C02\u0C2D\u0C02",save:"\u0C38\u0C47\u0C35\u0C4D",start:"\u0C2A\u0C4D\u0C30\u0C3E\u0C30\u0C02\u0C2D\u0C3F\u0C02\u0C1A\u0C41",yes:"\u0C05\u0C35\u0C41\u0C28\u0C41"},errors:{generic:"\u0C0F\u0C26\u0C4B \u0C24\u0C2A\u0C4D\u0C2A\u0C41 \u0C1C\u0C30\u0C3F\u0C17\u0C3F\u0C02\u0C26\u0C3F. \u0C26\u0C2F\u0C1A\u0C47\u0C38\u0C3F \u0C2E\u0C33\u0C4D\u0C32\u0C40 \u0C2A\u0C4D\u0C30\u0C2F\u0C24\u0C4D\u0C28\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F.",offline:"\u0C2E\u0C40\u0C30\u0C41 \u0C06\u0C2B\u0C4D\u200C\u0C32\u0C48\u0C28\u0C4D\u200C\u0C32\u0C4B \u0C09\u0C28\u0C4D\u0C28\u0C1F\u0C4D\u0C32\u0C41 \u0C15\u0C28\u0C3F\u0C2A\u0C3F\u0C38\u0C4D\u0C24\u0C4B\u0C02\u0C26\u0C3F."},games:{chess:{desc:"\u0C15\u0C4D\u0C32\u0C3E\u0C38\u0C3F\u0C15\u0C4D \u0C07\u0C26\u0C4D\u0C26\u0C30\u0C41 \u0C06\u0C1F\u0C17\u0C3E\u0C33\u0C4D\u0C32 \u0C35\u0C4D\u0C2F\u0C42\u0C39\u0C3E\u0C24\u0C4D\u0C2E\u0C15 \u0C06\u0C1F.",name:"\u0C1A\u0C26\u0C30\u0C02\u0C17\u0C02"},"dumb-charades":{desc:"\u0C05\u0C2D\u0C3F\u0C28\u0C2F\u0C02\u0C24\u0C4B \u0C1A\u0C46\u0C2A\u0C4D\u0C2A\u0C02\u0C21\u0C3F \u2014 \u0C38\u0C3F\u0C28\u0C3F\u0C2E\u0C3E\u0C32\u0C41, \u0C2A\u0C3E\u0C1F\u0C32\u0C41, \u0C35\u0C4D\u0C2F\u0C15\u0C4D\u0C24\u0C41\u0C32\u0C41 & \u0C2E\u0C30\u0C3F\u0C28\u0C4D\u0C28\u0C3F.",name:"\u0C21\u0C2E\u0C4D \u0C1A\u0C30\u0C47\u0C21\u0C4D\u0C38\u0C4D"},"snake-ladder":{desc:"100\u0C15\u0C41 \u0C1A\u0C47\u0C30\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F \u2014 \u0C2A\u0C3E\u0C2E\u0C41\u0C32\u0C28\u0C41 \u0C24\u0C2A\u0C4D\u0C2A\u0C3F\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F, \u0C28\u0C3F\u0C1A\u0C4D\u0C1A\u0C46\u0C28\u0C32\u0C41 \u0C0E\u0C15\u0C4D\u0C15\u0C02\u0C21\u0C3F.",name:"\u0C2A\u0C3E\u0C2E\u0C41-\u0C28\u0C3F\u0C1A\u0C4D\u0C1A\u0C46\u0C28"},tambola:{desc:"\u0C15\u0C4D\u0C32\u0C3E\u0C38\u0C3F\u0C15\u0C4D \u0C24\u0C02\u0C2C\u0C4B\u0C32\u0C3E / \u0C39\u0C4C\u0C38\u0C40 \u0C28\u0C02\u0C2C\u0C30\u0C4D \u0C15\u0C3E\u0C32\u0C3F\u0C02\u0C17\u0C4D.",name:"\u0C24\u0C02\u0C2C\u0C4B\u0C32\u0C3E"}},lobby:{comingSoon:"\u0C2E\u0C30\u0C3F\u0C28\u0C4D\u0C28\u0C3F \u0C06\u0C1F\u0C32\u0C41 \u0C24\u0C4D\u0C35\u0C30\u0C32\u0C4B",playNow:"\u0C07\u0C2A\u0C4D\u0C2A\u0C41\u0C21\u0C41 \u0C06\u0C21\u0C02\u0C21\u0C3F",players:"\u0C06\u0C1F\u0C17\u0C3E\u0C33\u0C4D\u0C32\u0C41",subtitle:"\u0C15\u0C41\u0C1F\u0C41\u0C02\u0C2C\u0C02 & \u0C38\u0C4D\u0C28\u0C47\u0C39\u0C3F\u0C24\u0C41\u0C32 \u0C15\u0C4B\u0C38\u0C02 \u0C38\u0C30\u0C26\u0C3E \u0C06\u0C1F\u0C32\u0C41",title:"\u0C06\u0C1F\u0C28\u0C41 \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F",unlimited:"{n}+"},nav:{about:"\u0C17\u0C41\u0C30\u0C3F\u0C02\u0C1A\u0C3F",games:"\u0C06\u0C1F\u0C32\u0C41",home:"\u0C39\u0C4B\u0C2E\u0C4D",rooms:"\u0C17\u0C26\u0C41\u0C32\u0C41",settings:"\u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C4D\u200C\u0C32\u0C41"},results:{title:"\u0C06\u0C1F \u0C2E\u0C41\u0C17\u0C3F\u0C38\u0C3F\u0C02\u0C26\u0C3F",winner:"\u0C35\u0C3F\u0C1C\u0C47\u0C24"},rooms:{create:"\u0C17\u0C26\u0C3F \u0C38\u0C43\u0C37\u0C4D\u0C1F\u0C3F\u0C02\u0C1A\u0C41",host:"\u0C39\u0C4B\u0C38\u0C4D\u0C1F\u0C4D",join:"\u0C17\u0C26\u0C3F\u0C32\u0C4B \u0C1A\u0C47\u0C30\u0C41",leave:"\u0C17\u0C26\u0C3F \u0C35\u0C26\u0C3F\u0C32\u0C3F \u0C35\u0C46\u0C33\u0C4D\u0C32\u0C41",notReady:"\u0C38\u0C3F\u0C26\u0C4D\u0C27\u0C02\u0C17\u0C3E \u0C32\u0C47\u0C30\u0C41",onlineSoon:"\u0C06\u0C28\u0C4D\u200C\u0C32\u0C48\u0C28\u0C4D \u0C2E\u0C32\u0C4D\u0C1F\u0C40\u0C2A\u0C4D\u0C32\u0C47\u0C2F\u0C30\u0C4D \u0C24\u0C4D\u0C35\u0C30\u0C32\u0C4B \u0C35\u0C38\u0C4D\u0C24\u0C4B\u0C02\u0C26\u0C3F \u2014 \u0C38\u0C4D\u0C25\u0C3E\u0C28\u0C3F\u0C15 \u0C17\u0C26\u0C41\u0C32\u0C41 \u0C08\u0C30\u0C4B\u0C1C\u0C41 \u0C2A\u0C28\u0C3F\u0C1A\u0C47\u0C38\u0C4D\u0C24\u0C3E\u0C2F\u0C3F.",players:"\u0C06\u0C1F\u0C17\u0C3E\u0C33\u0C4D\u0C32\u0C41",ready:"\u0C38\u0C3F\u0C26\u0C4D\u0C27\u0C02",remove:"\u0C24\u0C4A\u0C32\u0C17\u0C3F\u0C02\u0C1A\u0C41",roomCode:"\u0C17\u0C26\u0C3F \u0C15\u0C4B\u0C21\u0C4D",selectGame:"\u0C06\u0C1F \u0C0E\u0C02\u0C1A\u0C41\u0C15\u0C4B\u0C02\u0C21\u0C3F",startGame:"\u0C06\u0C1F \u0C2A\u0C4D\u0C30\u0C3E\u0C30\u0C02\u0C2D\u0C3F\u0C02\u0C1A\u0C41",title:"\u0C17\u0C47\u0C2E\u0C4D \u0C17\u0C26\u0C41\u0C32\u0C41",yourName:"\u0C2E\u0C40 \u0C2A\u0C47\u0C30\u0C41"},settings:{animations:"\u0C2F\u0C3E\u0C28\u0C3F\u0C2E\u0C47\u0C37\u0C28\u0C4D\u0C32\u0C41",appearance:"\u0C30\u0C42\u0C2A\u0C02",language:"\u0C2D\u0C3E\u0C37",off:"\u0C06\u0C2B\u0C4D",on:"\u0C06\u0C28\u0C4D",sound:"\u0C36\u0C2C\u0C4D\u0C26\u0C02",theme:"\u0C25\u0C40\u0C2E\u0C4D",themeDark:"\u0C21\u0C3E\u0C30\u0C4D\u0C15\u0C4D",themeLight:"\u0C32\u0C48\u0C1F\u0C4D",themeSystem:"\u0C38\u0C3F\u0C38\u0C4D\u0C1F\u0C2E\u0C4D",title:"\u0C38\u0C46\u0C1F\u0C4D\u0C1F\u0C3F\u0C02\u0C17\u0C4D\u200C\u0C32\u0C41"}};var me={about:{body:"\u0917\u0947\u092E \u0928\u093E\u0907\u091F \u092A\u0930\u093F\u0935\u093E\u0930 \u0915\u0947 \u0905\u0928\u0941\u0915\u0942\u0932 \u092E\u091C\u093C\u0947\u0926\u093E\u0930 \u0916\u0947\u0932\u094B\u0902 \u0915\u093E \u0938\u0902\u0917\u094D\u0930\u0939 \u0939\u0948\u0964 \u090F\u0915 \u0939\u0940 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0938\u093E\u0925 \u0916\u0947\u0932\u0947\u0902 \u2014 \u0911\u0928\u0932\u093E\u0907\u0928 \u092E\u0932\u094D\u091F\u0940\u092A\u094D\u0932\u0947\u092F\u0930 \u0930\u094B\u0921\u092E\u0948\u092A \u092E\u0947\u0902 \u0939\u0948\u0964",title:"\u091C\u093E\u0928\u0915\u093E\u0930\u0940"},ads:{label:"\u0935\u093F\u091C\u094D\u091E\u093E\u092A\u0928"},app:{name:"Game Night",tagline:"\u0916\u0947\u0932 \u091A\u0941\u0928\u0947\u0902\u0964 \u0938\u093E\u0925 \u092C\u0948\u0920\u0947\u0902\u0964 \u0916\u0947\u0932\u0947\u0902\u0964"},common:{back:"\u0935\u093E\u092A\u0938",cancel:"\u0930\u0926\u094D\u0926 \u0915\u0930\u0947\u0902",chooseAnother:"\u0926\u0942\u0938\u0930\u093E \u0916\u0947\u0932 \u091A\u0941\u0928\u0947\u0902",close:"\u092C\u0902\u0926 \u0915\u0930\u0947\u0902",confirm:"\u092A\u0941\u0937\u094D\u091F\u093F \u0915\u0930\u0947\u0902",home:"\u0939\u094B\u092E",loading:"\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026",name:"\u0928\u093E\u092E",newGame:"\u0928\u092F\u093E \u0916\u0947\u0932",no:"\u0928\u0939\u0940\u0902",ok:"\u0920\u0940\u0915 \u0939\u0948",playAgain:"\u092B\u093F\u0930 \u0938\u0947 \u0916\u0947\u0932\u0947\u0902",playersLabel:"\u0916\u093F\u0932\u093E\u0921\u093C\u0940",restart:"\u092A\u0941\u0928\u0903 \u0906\u0930\u0902\u092D",save:"\u0938\u0939\u0947\u091C\u0947\u0902",start:"\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",yes:"\u0939\u093E\u0901"},errors:{generic:"\u0915\u0941\u091B \u0917\u0932\u0924 \u0939\u094B \u0917\u092F\u093E\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964",offline:"\u0906\u092A \u0911\u092B\u093C\u0932\u093E\u0907\u0928 \u0932\u0917 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964"},games:{chess:{desc:"\u0915\u094D\u0932\u093E\u0938\u093F\u0915 \u0926\u094B-\u0916\u093F\u0932\u093E\u0921\u093C\u0940 \u0930\u0923\u0928\u0940\u0924\u093F \u0916\u0947\u0932\u0964",name:"\u0936\u0924\u0930\u0902\u091C"},"dumb-charades":{desc:"\u0905\u092D\u093F\u0928\u092F \u0938\u0947 \u092C\u0924\u093E\u090F\u0902 \u2014 \u092B\u093C\u093F\u0932\u094D\u092E\u0947\u0902, \u0917\u093E\u0928\u0947, \u0932\u094B\u0917 \u0914\u0930 \u092C\u0939\u0941\u0924 \u0915\u0941\u091B\u0964",name:"\u0921\u092E \u0936\u0930\u093E\u0921\u094D\u0938"},"snake-ladder":{desc:"100 \u0924\u0915 \u092A\u0939\u0941\u0902\u091A\u0947\u0902 \u2014 \u0938\u093E\u0902\u092A\u094B\u0902 \u0938\u0947 \u092C\u091A\u0947\u0902, \u0938\u0940\u0922\u093C\u093F\u092F\u093E\u0902 \u091A\u0922\u093C\u0947\u0902\u0964",name:"\u0938\u093E\u0902\u092A-\u0938\u0940\u0922\u093C\u0940"},tambola:{desc:"\u0915\u094D\u0932\u093E\u0938\u093F\u0915 \u0924\u0902\u092C\u094B\u0932\u093E / \u0939\u093E\u0909\u0938\u0940 \u0928\u0902\u092C\u0930 \u0915\u0949\u0932\u093F\u0902\u0917\u0964",name:"\u0924\u0902\u092C\u094B\u0932\u093E"}},lobby:{comingSoon:"\u0914\u0930 \u0916\u0947\u0932 \u091C\u0932\u094D\u0926 \u0906 \u0930\u0939\u0947 \u0939\u0948\u0902",playNow:"\u0905\u092D\u0940 \u0916\u0947\u0932\u0947\u0902",players:"\u0916\u093F\u0932\u093E\u0921\u093C\u0940",subtitle:"\u092A\u0930\u093F\u0935\u093E\u0930 \u0914\u0930 \u0926\u094B\u0938\u094D\u0924\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u092E\u091C\u093C\u0947\u0926\u093E\u0930 \u0916\u0947\u0932",title:"\u0916\u0947\u0932 \u091A\u0941\u0928\u0947\u0902",unlimited:"{n}+"},nav:{about:"\u091C\u093E\u0928\u0915\u093E\u0930\u0940",games:"\u0916\u0947\u0932",home:"\u0939\u094B\u092E",rooms:"\u0915\u092E\u0930\u0947",settings:"\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938"},results:{title:"\u0916\u0947\u0932 \u0938\u092E\u093E\u092A\u094D\u0924",winner:"\u0935\u093F\u091C\u0947\u0924\u093E"},rooms:{create:"\u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902",host:"\u0939\u094B\u0938\u094D\u091F",join:"\u0930\u0942\u092E \u092E\u0947\u0902 \u091C\u0941\u0921\u093C\u0947\u0902",leave:"\u0930\u0942\u092E \u091B\u094B\u0921\u093C\u0947\u0902",notReady:"\u0924\u0948\u092F\u093E\u0930 \u0928\u0939\u0940\u0902",onlineSoon:"\u0911\u0928\u0932\u093E\u0907\u0928 \u092E\u0932\u094D\u091F\u0940\u092A\u094D\u0932\u0947\u092F\u0930 \u091C\u0932\u094D\u0926 \u0906 \u0930\u0939\u093E \u0939\u0948 \u2014 \u0938\u094D\u0925\u093E\u0928\u0940\u092F \u0930\u0942\u092E \u0906\u091C \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964",players:"\u0916\u093F\u0932\u093E\u0921\u093C\u0940",ready:"\u0924\u0948\u092F\u093E\u0930",remove:"\u0939\u091F\u093E\u090F\u0902",roomCode:"\u0930\u0942\u092E \u0915\u094B\u0921",selectGame:"\u0916\u0947\u0932 \u091A\u0941\u0928\u0947\u0902",startGame:"\u0916\u0947\u0932 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",title:"\u0917\u0947\u092E \u0930\u0942\u092E",yourName:"\u0906\u092A\u0915\u093E \u0928\u093E\u092E"},settings:{animations:"\u090F\u0928\u093F\u092E\u0947\u0936\u0928",appearance:"\u0930\u0942\u092A",language:"\u092D\u093E\u0937\u093E",off:"\u092C\u0902\u0926",on:"\u091A\u093E\u0932\u0942",sound:"\u0927\u094D\u0935\u0928\u093F",theme:"\u0925\u0940\u092E",themeDark:"\u0921\u093E\u0930\u094D\u0915",themeLight:"\u0932\u093E\u0907\u091F",themeSystem:"\u0938\u093F\u0938\u094D\u091F\u092E",title:"\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938"}};var ue={bingo:{ballsToWin:"Balls drawn",botClaimed:"\u{1F916} {name} claimed {pattern}!",botDaubed:"{count} daubed",botProgress:"{covered}/5 toward a line",bots:"Computer opponents",callPaused:"Paused",callResume:"Resume",cellCalled:"{n} \u2014 called, tap to daub",cellDaubed:"{n} \u2014 daubed",cellNotCalled:"{n} \u2014 not called yet",claim:"\u{1F389} CLAIM {pattern}!",claimHint:"You completed {pattern} \u2014 claim it before the bots do!",computerThinking:"The computers never miss a ball\u2026",daubHint:"Tap a called number on your card to daub it",exitGame:"Exit",free:"FREE",patternBlackout:"Blackout",patternFourCorners:"Four corners",patternLine:"Line",recentBalls:"Recent balls",startGame:"Start game",waitingFirstBall:"Waiting for the first ball\u2026",winPattern:"Winning pattern",winner:"\u{1F389} {name} wins!",yourCard:"Your card",yourName:"Your name",mpAllBallsDrawn:"All balls have been drawn",mpCaller:"Caller: {name}",mpClaimRejected:"Claim rejected \u2014 that pattern is not complete yet.",mpClaimSent:"Claim sent \u2014 waiting for the host to verify\u2026",mpDaubHint:"Called numbers light up automatically. Tap a called number to daub it.",mpDrawnNumbers:"Drawn numbers",mpHostCaller:"You are the caller \u2014 balls draw automatically",mpInterval:"Ball interval",mpIntervalOption:"{n} seconds",mpMode:"How to play",mpPattern:"Winning pattern",mpPatternGoal:"First to complete: {pattern}",mpProgress:"{covered}/{total} toward {pattern}",mpVsComputer:"Vs computer"},games:{bingo:{desc:"75-ball bingo \u2014 daub your card and shout before the computer does!",name:"Bingo"}}};var ce={charades:{actorOnly:"actor only \u2014 no peeking!",all:"All",category:"Category",confirmEndMsg:"The final result will use the scores so far.",confirmEndTitle:"End the game now?",correct:"Correct",customCategory:"Custom category",customPlaceholder:"Try 'cricketers', 'Telugu movies', 'space scientists'\u2026",difficulty:"Difficulty",easy:"Easy",endTurn:"End turn",finishGame:"End game",generate:"Generate",generating:"Generating fresh words\u2026",generationFailed:"Couldn't generate words \u2014 try again or pick a preset category.",hard:"Hard",hideWord:"Hide word",lang:{en:"English",hi:"\u0939\u093F\u0928\u094D\u0926\u0940",te:"\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"},language:"Language",medium:"Medium",mpActNow:"Act it out \u2014 no talking!",mpActing:"\u{1F3AD} {actor} is acting for {team} \u2014 guess out loud!",mpGotIt:"\u2713 Got it!",mpLastGot:"\u2713 Got it!",mpLastPass:"\u23ED Passed",mpNextUp:"Next actor",mpPassWord:"\u23ED Pass",mpStartTurn:"Start turn",mpWaitingStart:"Waiting for the host to start the turn\u2026",mpWordIncoming:"Your word is on its way\u2026",noWords:"No words found for this combination \u2014 try a different category or difficulty.",pause:"Pause",playMode:"Play mode",pts:"pts",random:"Random mix",resume:"Resume",reveal:"Tap to reveal",round:"Round",rounds:"Rounds",sameDevice:"Same device",score:"Score",seconds:"s",setupTitle:"Set up the game",skip:"Skip",startGame:"Start game",startTimer:"Start timer",team:"Team",teamCount:"Number of teams",teamName:"Team name",teams:"Teams",tie:"It's a tie!",timeUp:"Time's up!",timer:"Timer",turn:"Turn",unlimited:"Unlimited",veryHard:"Very Hard",wins:"wins!",words:"words",yourWord:"Your word"}};var de={chess:{blackName:"Black player name",blackToMove:"Black to move",cancel:"Cancel",captured:"Captured",check:"Check!",checkmate:"Checkmate",choosePromotion:"Choose a piece to promote to:",confirmNewGame:"Start a new game? The current game will be lost.",confirmResign:"{name}, are you sure you want to resign?",draw:"Draw",fiftyMove:"Fifty-move rule",flip:"Flip Board",gameDraw:"\u{1F91D} Draw",insufficient:"Insufficient material",moves:"Moves",mpYouAreWhite:"You play White \u2014 your friend joins as Black",newGame:"New Game",passAndPlay:"Pass & Play",player1:"Player 1",player2:"Player 2",promotion:"Promotion",resign:"Resign",result:"Result",setupTitle:"Chess Setup",stalemate:"Stalemate",startGame:"Start Game",threefold:"Threefold repetition",undo:"Undo",whiteName:"White player name",whiteToMove:"White to move",youWin:"\u{1F3C6} {name} wins!",hints:"\u{1F4A1} Hints",hintsOn:"\u{1F4A1} Hints: on",hintsOff:"\u{1F4A1} Hints: off"},games:{chess:{desc:"Classic two-player chess with tap-to-move controls.",name:"Chess"}}};var pe={games:{ludo:{desc:"Race 4 tokens home \u2014 capture rivals, dodge captures, play vs computer",name:"Ludo"}},ludo:{botBadge:"\u{1F916}",cancel:"Cancel",captured:"\u2694\uFE0F {name} captures {victim}!",capturesTag:"\u2694\uFE0F captures!",chooseToken:"Choose a token to move",computer:"Computer",endGame:"End game",endGameConfirm:"End game",endGameMessage:"The player with the most tokens home will be declared the winner.",endGameTitle:"End this game?",exit:"Exit",extraTurn:"\u{1F3B2} Rolled a 6 \u2014 roll again!",finishesTag:"\u{1F3E0} finishes!",forfeit:"Three 6s in a row! {name}'s turn is skipped",homeStretch:"home stretch",human:"Human",leftBase:"\u{1F680} {name} brings a token out!",moveBy:"Token {token}: +{roll}",moveOut:"Token {token}: leave base \u{1F680}",noMoves:"{name} can't move \u2014 turn passes",passAndPlay:"Pass & play",playVsComputer:"\u{1F5A5} Play vs Computer",player:"Player {n}",playerCount:"Players",rollDice:"\u{1F3B2} Roll dice",rolling:"Rolling\u2026",safeLanding:"\u2B50 {name} lands on a safe square",safeTag:"\u2B50 safe",setupTitle:"Ludo",standings:"Standings",startGame:"Start game",thinking:"thinking\u2026",toHome:"home \u{1F3E0}",toStart:"start",tokenHome:"\u{1F3E0} {name} brings a token home!",tokensHome:"{count}/4 home",turnOf:"{name}'s turn",winner:"\u{1F3C6} {name} wins!"}};var fe={games:{poker:{desc:"Texas Hold'em practice \u2014 learn the ropes against the bots.",name:"Poker"}},poker:{actionFailed:"Move failed: {error}",action_allin:"All-in",action_bet:"Bet",action_call:"Call {amount}",action_check:"Check",action_fold:"Fold",action_raise:"Raise",alreadyInProgress:"A hand is already in progress.",betAmount:"Bet amount",bigBlind:"big blind",biggestPot:"Biggest pot",blinds:"Blinds",blindsValue:"Small blind {sb} \xB7 Big blind {bb} (fixed for practice)",botBadge:"BOT",botCount:"Computer opponents",botThinking:"\u{1F916} {name} is thinking\u2026",cancel:"Cancel",chips:"{n} chips",close:"Close",confirmBet:"Bet {amount}",confirmRaise:"Raise to {amount}",dealer:"Dealer",eliminatedMsg:"{name} is out of chips!",endSession:"End session",faceDownCard:"Face-down card",fullPot:"Pot",gotIt:"Got it",halfPot:"\xBD pot",handComplete:"Hand {n} complete",handNumber:"Hand {n}",handsPlayed:"Hands played",histAllin:"{name} goes all-in ({amount}).",histBet:"{name} bets {amount}.",histBlind:"{name} posts the {blind} ({amount}).",histCall:"{name} calls {amount}.",histCheck:"{name} checks.",histDeal:"Hole cards dealt.",histEliminated:"{name} is eliminated.",histFold:"{name} folds.",histHandEnd:"Hand over.",histPot:"{names} win{s} {amount} ({hand}).",histRaise:"{name} raises to {amount}.",histShowdown:"{name} shows {cards} ({hand}).",histStreet:"\u2014 {street} \u2014",history:"Hand history",howToPlay:"\u{1F4D6} How to play",invalidAction:"That move isn't possible right now.",leaveTable:"Leave table",maxLabel:"Max {amount}",minLabel:"Min {amount}",mpAccountingCol:"Accounting",mpActionFailed:"That didn't work \u2014 try again.",mpAllowLateJoin:"Allow late join",mpAllowLateJoinHint:"Friends can join after the game starts.",mpBack:"Back",mpBackToPoker:"Back to poker",mpBalanced:"\u2713 Balanced",mpBigBlind:"Big blind",mpBiggestLoss:"Biggest loss",mpBlindsValue:"Blinds {sb}/{bb}",mpBreakEven:"break-even",mpBuyInCol:"Buy-in",mpBuyInFrom:"Buy-in from {min}",mpBuyInRange:"Buy-in {min}\u2013{max}",mpChooseChips:"Choose your chips",mpCloseRoom:"Close room",mpCodeLabel:"Room code",mpCodePh:"e.g. K7Q2XD",mpConfirmCloseMsg:"This ends the session for everyone and generates the final report.",mpConfirmCloseTitle:"Close room?",mpConfirmLeaveTable:"Leave the table? Your seat stays reserved for a bit so you can rejoin.",mpConfirmRebuy:"Rebuy {amount}",mpConfirmRemove:"Remove {name} from the room?",mpConnected:"Connected",mpContinue:"Continue",mpContributedCol:"Contributed",mpCopied:"Copied!",mpCopyCode:"Copy code",mpCopyFailed:"Copy failed \u2014 long-press to copy manually.",mpCopyLink:"Copy link",mpCopySummary:"Copy summary",mpCreate:"Create Private Room",mpCreateFailed:"Could not create the room. Check your connection and try again.",mpCreateRoomBtn:"Create room",mpCreateTitle:"Create Private Room",mpCustom:"Custom",mpCustomBuyIn:"Custom buy-in amount",mpCustomStack:"Custom amount",mpDisconnected:"Disconnected",mpDuration:"Session duration",mpDurationCol:"Duration",mpDurationMin:"Duration in minutes",mpEditRules:"Edit rules",mpEnterLobby:"Enter lobby",mpErrBlindOrder:"Big blind must be bigger than the small blind.",mpErrBlindsPositive:"Blinds must be positive.",mpErrBuyInBlind:"Min buy-in must be at least the small blind.",mpErrBuyInOrder:"Max buy-in must be at least the min buy-in.",mpErrBuyInPositive:"Buy-ins can't be negative.",mpErrCode:"Enter a room code.",mpErrDuration:"Duration must be between 1 and 1440 minutes.",mpErrHostName:"Enter your display name.",mpErrName:"Enter your display name.",mpErrRebuyOrder:"Rebuy max must be at least the rebuy min.",mpErrRebuyPositive:"Rebuy amounts must be positive.",mpErrRoomName:"Give your room a name.",mpErrStackAboveMax:"Starting stack is above the max buy-in.",mpErrStackBelowMin:"Starting stack is below the min buy-in.",mpErrStackMin:"Starting stack must be at least 100.",mpErrStackPositive:"Starting stack must be positive.",mpFinalChipsCol:"Final chips",mpFindRoom:"Find room",mpHandsCol:"Hands",mpHandsPlayedCol:"Hands",mpHandsShort:"{n} hands",mpHandsWonOf:"{won} won / {played} played",mpHost:"Host",mpHostName:"Your display name (host)",mpHostedBy:"Hosted by",mpHouseRules:"House rules",mpHouseRulesPh:"e.g. No phones at the table. Straddles allowed.",mpImReady:"I'm ready \u2713",mpInvestedCol:"Total in",mpInviteLink:"Invite link",mpJoin:"Join Private Room",mpJoinFailed:"Could not join. Check the code and try again.",mpJoinRoomBtn:"Join room",mpJoinTitle:"Join a Private Room",mpLateJoinDenied:"Late join is not allowed in this room \u2014 wait for the next game.",mpLateJoinOk:"Late join allowed",mpLeaveRoom:"Leave room",mpLeaveTable:"Leave table",mpLoadingTable:"Loading the table\u2026",mpLobbyLoadFailed:"Could not load the room. Try again.",mpLobbyTitle:"Room Lobby",mpLookup:"Look up",mpLookupLabel:"Look up a room code",mpLoss:"loss",mpMaxBuyIn:"Max buy-in",mpMaxBuyInHint:"0 = no max",mpMaxPlayers:"Max players",mpMaxRebuys:"Max rebuys per player",mpMenuSub:"Private rooms for your own group. Create a room and share the code, or join with a code from a friend.",mpMenuTitle:"\u{1F0CF} Poker \u2014 Play with Friends",mpMinBuyIn:"Min buy-in",mpMinutes:"minutes",mpNeedTwoReady:"Need at least 2 ready players to start.",mpNetCol:"Net",mpNoPast:"No past games yet. Finish a private room session and its report will appear here.",mpNoPlayers:"No players in this report.",mpNotReady:"Not ready",mpOccupancy:"{a}/{b} players",mpOnThisDevice:"On this device",mpOpenEnded:"Open-ended",mpPassword:"Password (optional)",mpPasswordHint:"Leave empty for no password",mpPasswordLabel:"Room password",mpPasswordNeeded:"This room needs a password",mpPastGames:"Past Games",mpPause:"Pause",mpPaused:"Paused",mpPlayWithFriends:"\u{1F4F2} Play with Friends",mpPrint:"Print",mpProfit:"profit",mpReady:"Ready",mpRebuy:"Rebuy",mpRebuyAmount:"Rebuy amount",mpRebuyMax:"Rebuy max",mpRebuyMin:"Rebuy min",mpRebuyRange:"Rebuy range",mpRebuyRules:"Rebuys {min}\u2013{max} (max {n})",mpRebuyTitle:"Rebuy chips",mpRebuyTotal:"Rebuy total {amount}",mpRebuysCol:"Rebuys",mpRebuysMidHand:"Allow rebuys mid-hand",mpRebuysMidHandHint:"Players can top up without leaving the hand.",mpRebuysTotalCol:"Rebuys (total)",mpRebuysUnlimited:"Unlimited rebuys",mpRebuysUsed:"Rebuys used",mpReconnecting:"Reconnecting\u2026",mpRemove:"Remove",mpRemoveTitle:"Remove player?",mpReportNotFound:"Report not found \u2014 it may have expired.",mpReportTitle:"Session Report",mpResume:"Resume",mpRetry:"Retry",mpRoomClosed:"This room is closed.",mpRoomCode:"Room code",mpRoomCreated:"Room created! \u{1F389}",mpRoomFull:"This room is full.",mpRoomName:"Room name",mpRoomNamePh:"e.g. Friday Night Poker",mpRoomNotFound:"Room not found \u2014 check the code and try again.",mpSavedHistory:"Saved to your history \u2713",mpSelectedAmount:"You're bringing {n} chips",mpShareHint:"Share the code or the link with your friends so they can join.",mpSittingOut:"You're sitting out this hand.",mpSmallBlind:"Small blind",mpStartGame:"Start game",mpStartingStack:"Starting chips",mpTableTitle:"Poker Table",mpTopWinner:"Top winner",mpTotalsCol:"Chips in play",mpUnbalanced:"\u26A0 Unbalanced",mpUnlimited:"Unlimited",mpUsedOf:"{used} of {max}",mpUsedUnlimited:"{used} (unlimited)",mpVoiceBadgeError:"{name} has a voice connection problem",mpVoiceBadgeMuted:"{name} is muted",mpVoiceBadgeOn:"{name} is on voice chat",mpVoiceBadgeSpeaking:"{name} is speaking",mpVoiceCount:"Voice chat {n}/{max}",mpVoiceDefault:"Default",mpVoiceJoin:"\u{1F399}\uFE0F Join voice",mpVoiceJoinFailed:"Couldn't start voice chat \u2014 check your connection and try again.",mpVoiceJoining:"Joining voice\u2026",mpVoiceLeave:"Leave voice",mpVoiceMicDenied:"Microphone access was denied.",mpVoiceMicDeniedHint:"Allow the microphone in your browser's site settings (tap the lock or tune icon in the address bar), then tap Join voice again.",mpVoiceMicFallback:"Microphone {n}",mpVoiceMicLabel:"Microphone",mpVoiceMute:"Mute mic",mpVoiceNoMic:"No microphone found on this device.",mpVoiceSettings:"Voice settings",mpVoiceSpeakerFallback:"Speaker {n}",mpVoiceSpeakerLabel:"Speaker",mpVoiceSpeakerOff:"Mute all voices",mpVoiceSpeakerOn:"Unmute all voices",mpVoiceStunNote:"Direct phone-to-phone audio (no relay server): some mobile networks may not connect.",mpVoiceTitle:"Voice chat",mpVoiceUnmute:"Unmute mic",mpVoiceYouSpeaking:"You're live \u{1F399}\uFE0F",mpWaitingFor:"{name}'s turn",mpWaitingForHost:"Waiting for the host to start the game\u2026",mpWrongPassword:"Wrong password.",mpYou:"you",mpYourCode:"Room code",mpYourName:"Your display name",mpYourStack:"Your stack",mpYourTurn:"Your turn!",needPlayers:"Need at least 2 players with chips to deal a hand.",newTable:"New table",nextHand:"Next hand",notYourTurn:"Wait for your turn.",onboard1:"Everyone gets 2 hidden cards. Then 5 shared cards are dealt face-up in the middle: 3 on the flop, 1 on the turn, 1 on the river.",onboard2:"Bet on each round \u2014 or fold if your hand looks weak. The best 5-card hand at the showdown takes the pot.",onboard3:"Blinds are {sb}/{bb} and fixed for practice. There's no real money here \u2014 just learn the game!",onboardTitle:"How a hand works",playTitle:"\u{1F0CF} Poker",player:"Player",pot:"Pot",raiseAmount:"Raise to",rankDesc:{flush:"Any five cards of the same suit.","four-of-a-kind":"Four cards of the same rank.","full-house":"Three of a kind plus a pair.","high-card":"No made hand \u2014 your highest card plays.","one-pair":"Two cards of the same rank.","royal-flush":"A, K, Q, J, 10 \u2014 all the same suit. The unbeatable hand.",straight:"Five cards in a row, mixed suits.","straight-flush":"Five cards in a row, all the same suit.","three-of-a-kind":"Three cards of the same rank.","two-pair":"Two different pairs."},rankExample:{flush:"A\u2666 J\u2666 9\u2666 6\u2666 3\u2666","four-of-a-kind":"Q\u2663 Q\u2666 Q\u2665 Q\u2660 7\u2666","full-house":"K\u2663 K\u2666 K\u2665 4\u2660 4\u2666","high-card":"A\u2663 K\u2666 9\u2665 6\u2660 3\u2666","one-pair":"10\u2665 10\u2663 A\u2666 7\u2660 4\u2665","royal-flush":"A\u2660 K\u2660 Q\u2660 J\u2660 10\u2660",straight:"10\u2663 9\u2666 8\u2665 7\u2660 6\u2663","straight-flush":"9\u2665 8\u2665 7\u2665 6\u2665 5\u2665","three-of-a-kind":"8\u2660 8\u2666 8\u2665 A\u2663 5\u2666","two-pair":"J\u2663 J\u2666 5\u2665 5\u2660 9\u2663"},rankNames:{flush:"Flush","four-of-a-kind":"Four of a kind","full-house":"Full house","high-card":"High card","one-pair":"One pair","royal-flush":"Royal flush",straight:"Straight","straight-flush":"Straight flush","three-of-a-kind":"Three of a kind","two-pair":"Two pair"},ranksSubtitle:"Strongest first. At showdown the best 5-card hand wins.",ranksTitle:"Hand rankings",rebuyConfirm:"Rebuy {amount}",rebuyMessage:"Rebuy for {amount} chips and keep playing?",rebuyTitle:"You're out of chips",restartConfirm:"New table",restartMessage:"Your current table, hands and chip counts will be lost.",restartTitle:"Start a new table?",rules1:"Each hand, every player gets 2 hole cards. Betting rounds happen before the flop, after the flop (3 cards), after the turn (4th card) and after the river (5th card).",rules2:"On your turn you can fold, check (if nobody bet), call (match the bet), bet/raise, or go all-in. Betting ends when everyone has matched the highest bet or folded.",rules3:"If everyone folds, the last player takes the pot without showing cards. Otherwise the best 5-card hand (your 2 + the 5 shared) wins at showdown. Split pots divide evenly.",rules4:"Bet and raise amounts are the NEW total bet for the round, not the extra on top. The minimum opening bet is the big blind ({bb}).",rules5:"Run out of chips and you're eliminated \u2014 rebuy to jump back in. Practice mode only: no real money, ever.",rulesTitle:"Poker rules (quick)",sessionDone:"\u{1F0CF} Poker session",setupTitle:"Poker \u2014 Practice Mode",showGuide:"Hand rankings",showRules:"Rules",showdownTitle:"Showdown",sidePot:"Side pot {n}",smallBlind:"small blind",startGame:"Start game",startingStack:"Starting chips",street_flop:"Flop",street_preflop:"Pre-flop",street_river:"River",street_showdown:"Showdown",street_turn:"Turn",thinking:"thinking\u2026",toCall:"To call: {amount}",totalPlayers:"{n} players at the table",winsPot:"{name} wins {amount} with {hand}!",winsUncontested:"{name} wins {amount} \u2014 everyone else folded.",youWinPot:"\u{1F389} You win {amount} with {hand}!",youWinUncontested:"\u{1F389} You win {amount} \u2014 everyone else folded!",yourChips:"Your chips",yourHand:"Your hand",yourName:"Your name",yourTurnCall:"{name}, your turn \u2014 call {amount} to continue",yourTurnFree:"{name}, your turn \u2014 check or bet"}};var he={snakeladder:{cancel:"Cancel",climbedLadder:"\u{1FA9C} {name} climbed a ladder to {square}!",endGame:"End game",endGameConfirm:"End game",endGameMessage:"The player in the lead will be declared the winner.",endGameTitle:"End this game?",extraTurn:"Extra turn on rolling a 6",extraTurnNote:"\u{1F3B2} Rolled a 6 \u2014 roll again!",player:"Player",playerCount:"Players",playerName:"Name",positions:"Final positions",rollDice:"\u{1F3B2} Roll dice",rolling:"Rolling\u2026",setupTitle:"Snake & Ladder",slidSnake:"\u{1F40D} Oh no! {name} slid down to {square}",startGame:"Start game",stayedPut:"Needs an exact roll to finish \u2014 {name} stays put",tapToRoll:"Tap to roll",turnOf:"{name}'s turn",winner:"\u{1F3C6} {name} wins!",yourTurn:"Your turn, {name}!",vsComputer:"Vs Computer",passAndPlay:"Pass & Play",computerOpponents:"Computer opponents",botThinking:"\u{1F916} {name} is thinking\u2026",difficulty:"Difficulty",easy:"Easy",medium:"Medium",hard:"Hard",easyDesc:"Lots of ladders, few snakes",mediumDesc:"Classic board",hardDesc:"Many snakes, very few ladders",yourRoll:"{name}, you have to roll the dice \u{1F3B2}",theirRoll:"{name} has to roll the dice \u{1F3B2}"}};var ge={tambola:{allNumbersCalled:"All 90 numbers have been called!",allPatternsClaimed:"Every pattern has been claimed already.",approve:"Approve",autoCall:"Auto-call",boardLabel:"Number board",callNumber:"\u{1F4E2} Call Number",calledCount:"{called} / 90",choosePattern:"1. Choose a pattern",chooseTicket:"2. Choose the ticket",claimApprovedToast:"\u{1F389} Claim approved!",claimLocked:"Claimed \u2713",claimRejectedToast:"Claim rejected.",claimWin:"\u{1F389} Claim Win",claimedWins:"Claimed wins",endGame:"End Game",endGameMessage:"Finish the game and show the results?",endGameTitle:"End the game?",gameOverTitle:"Tambola Over",intervalLabel:"Auto-call interval",intervalSeconds:"{n}s",invalidClaim:"Not valid \u2014 some required numbers are not called yet.",noClaimsLine:"No wins claimed",noClaimsYet:"No claims yet \u2014 tap \u201CClaim Win\u201D when someone shouts!",numbersCalledLabel:"Numbers called",patterns:{bottomLine:"Bottom Line",earlyFive:"Early Five",fourCorners:"Four Corners",fullHouse:"Full House",middleLine:"Middle Line",topLine:"Top Line"},patternsLabel:"Winning patterns",pause:"\u23F8 Pause",playerName:"Player {n}",players:"Players",previousLabel:"Previous",reject:"Reject",reset:"Reset",resetMessage:"All called numbers will be cleared and claims removed. Players and tickets stay.",resetTitle:"Reset the calling?",resume:"\u25B6 Resume",setupTitle:"Set up the game",startGame:"Start Game",stepperDecrease:"Decrease",stepperIncrease:"Increase",ticketLabel:"Ticket {n}",ticketsLabel:"Tickets",ticketsPerPlayer:"Tickets per player",validClaim:"Valid \u2014 every required number has been called.",verify:"Verify",verifyClaim:"3. Verify the ticket",waitingFirstCall:"Tap \u201CCall Number\u201D to call the first number",winnerLine:"{player} \xB7 {pattern}",modeLabel:"How do you want to play?",modeSameDevice:"Same device",modeSameDeviceDesc:"Pass one phone around the table",modeMultiPhone:"Multi-phone (QR)",modeMultiPhoneDesc:"Everyone plays on their own phone",createRoom:"Create room & show QR",multiPhoneTitle:"Multi-phone Tambola",creatingRoom:"Creating your room\u2026",qrTitle:"Scan to join",qrAlt:"QR code to join this Tambola room",qrHint:"Players scan this with their phone camera, or type the code below at the join screen.",roomCodeLabel:"Room code",playersJoinedTitle:"Players joined",waitingPlayers:"Waiting for players to scan the QR code\u2026",playersJoinedCount:"{n} joined",startMultiGame:"Start game",pendingClaimsTitle:"Claims to verify",noPendingClaims:"No claims yet \u2014 claims from players appear here.",hostVerifyTitle:"Verify claim",verifyPrompt:"{name} claims {pattern} \u2014 verify the ticket:",joinTitle:"Join Tambola",joinSubtitle:"Room {code} \u2014 enter your name to get your ticket.",gameInProgress:"Game already started \u2014 you can still rejoin with the same name.",nameLabel:"Your name",namePlaceholder:"e.g. Ravi",joinButton:"Join game",joining:"Joining\u2026",waitingHost:"Waiting for the host to start\u2026",yourTicketLabel:"Your ticket",calledOfN:"{called} of 90 called",dabHint:"Called numbers turn green with a \u2713. Tap any number to dab it.",cellCalled:"{n}, called",cellUncalled:"{n}, not called yet",cellDabbed:"{n}, called and dabbed",legendCalled:"Called",legendDabbed:"Dabbed by you",claimPendingMsg:"Waiting for the host to verify \u201C{pattern}\u201D\u2026",noClaimable:"All patterns are claimed \u2014 nice playing!",roomNotFound:"Room not found \u2014 check the code and try again.",alreadyStarted:"This game already started. Rejoin with the same name you used before.",roomFull:"This room is full.",backHome:"Back to home"}};var ye={common:{retry:"Try Again",close:"Close"}};var be={mp:{alreadyStarted:"This game has already started. Ask the host for a new room.",createFailed:"Could not create the room. Check your connection and try again.",createRoom:"Create room & show QR",creatingRoom:"Creating your room\u2026",gameEnded:"Game over",host:"Host",joinFailed:"Could not join. Check the code and try again.",joinGame:"Join game",leave:"Leave",multiPhone:"Multi-phone (QR)",multiPhoneDesc:"Friends join on their own phones",needPlayers:"Waiting for players \u2014 at least {n} needed to start",orEnterCode:"or open the game and enter this code",players:"Players",reconnecting:"Reconnecting\u2026",roomCode:"Room code",roomNotFound:"Room not found \u2014 check the code and try again.",scanToJoin:"Friends: scan to join on your phone",startGame:"Start game",turnOf:"{name}'s turn",waitingForHost:"Waiting for the host to start\u2026",waitingForTurn:"Waiting for {name}\u2026",you:"You",yourName:"Your name",yourTurn:"Your turn!"}};var j={en:se,te:le,hi:me},yn=[ue,ce,de,pe,fe,he,ge,ye,be];function V(e,n){for(let[t,o]of Object.entries(n))typeof o=="object"&&o!==null&&!Array.isArray(o)&&typeof e[t]=="object"&&e[t]!==null&&!Array.isArray(e[t])?V(e[t],o):e[t]=o;return e}var ke=V({},j.en);for(let e of yn)V(ke,e);var ve={en:ke,te:j.te,hi:j.hi};function we(e,n){let t=e;for(let o of n.split(".")){if(typeof t!="object"||t===null)return;t=t[o]}return typeof t=="string"?t:void 0}function bn(e,n){return we(ve[e],n)??we(ve.en,n)??n}var Ce=(0,f.createContext)({lang:"en",setLang:()=>{}});function ct({children:e}){let[n,t]=(0,f.useState)(()=>{let r=localStorage.getItem("gh-lang");return r==="te"||r==="hi"?r:"en"}),o=r=>{t(r),localStorage.setItem("gh-lang",r)};return(0,f.useEffect)(()=>{document.documentElement.lang=n},[n]),(0,f.createElement)(Ce.Provider,{value:{lang:n,setLang:o}},e)}function h(){let{lang:e,setLang:n}=(0,f.useContext)(Ce);return{t:t=>bn(e,t),lang:e,setLang:n}}var Pe=u(c());function b({children:e,onClick:n,variant:t="primary",size:o="md",disabled:r=!1,fullWidth:a=!1,type:i="button",ariaLabel:s}){return(0,Pe.jsx)("button",{type:i,onClick:n,disabled:r,"aria-label":s,className:`ui-btn ui-btn-${t} ui-btn-${o}${a?" ui-btn-full":""}`,children:e})}var D=u(c());function W({children:e,title:n,className:t}){return(0,D.jsxs)("section",{className:`ui-card${t?` ${t}`:""}`,children:[n?(0,D.jsx)("h2",{className:"ui-card-title",children:n}):null,e]})}var H=u(w());var T=u(c());function Y({open:e,onClose:n,title:t,children:o}){let r=(0,H.useRef)(null),{t:a}=h();return(0,H.useEffect)(()=>{if(!e)return;let s=m=>{m.key==="Escape"&&n()};return document.addEventListener("keydown",s),r.current?.focus(),()=>document.removeEventListener("keydown",s)},[e,n]),e?(0,T.jsx)("div",{className:"ui-modal-overlay",onClick:s=>{s.target===s.currentTarget&&n()},children:(0,T.jsxs)("div",{ref:r,tabIndex:-1,role:"dialog","aria-modal":"true","aria-label":t,className:"ui-modal-panel",children:[(0,T.jsx)("button",{type:"button",className:"ui-modal-close",onClick:n,"aria-label":a("common.close"),children:"\u2715"}),t?(0,T.jsx)("h2",{className:"ui-modal-title",children:t}):null,o]})}):null}var g=u(w()),S=u(c()),Se=(0,g.createContext)(null),Tn=3500;function Pn({children:e}){let[n,t]=(0,g.useState)([]),o=(0,g.useRef)(1),r=(0,g.useCallback)((a,i="info")=>{let s=o.current++;t(m=>[...m,{id:s,msg:a,kind:i}]),window.setTimeout(()=>{t(m=>m.filter(d=>d.id!==s))},Tn)},[]);return(0,S.jsxs)(Se.Provider,{value:{toast:r},children:[e,(0,S.jsx)("div",{className:"ui-toast-container","aria-live":"polite",role:"status",children:n.map(a=>(0,S.jsx)("div",{className:`ui-toast ui-toast-${a.kind}`,children:a.msg},a.id))})]})}function Sn(){let e=(0,g.useContext)(Se);if(!e)throw new Error("useToast must be used inside <ToastProvider>");return e}var Ee=u(c()),Ne=["#ef476f","#f78c6b","#ffd166","#06d6a0","#118ab2","#9b5de5","#00f5d4","#f15bb5","#ff8fab","#43aa8b"];function Nn(e){let n=0;for(let t=0;t<e.length;t++)n=n*31+e.charCodeAt(t)>>>0;return Ne[n%Ne.length]}function En(e){return e.trim().split(/\s+/).slice(0,2).map(n=>(n[0]??"").toUpperCase()).join("")}function $({name:e,color:n,size:t=40}){let o=n??Nn(e);return(0,Ee.jsx)("span",{className:"ui-avatar","aria-label":e,style:{backgroundColor:o,width:t,height:t,fontSize:Math.round(t*.4)},children:En(e)})}var Le=u(c());function Ln(){let{t:e}=h();return(0,Le.jsx)("span",{className:"ui-spinner",role:"status","aria-label":e("common.loading")})}var k=u(c());function Bn({open:e,title:n,message:t,confirmLabel:o,cancelLabel:r,onConfirm:a,onCancel:i,danger:s=!1}){return(0,k.jsxs)(Y,{open:e,onClose:i,title:n,children:[(0,k.jsx)("p",{className:"ui-confirm-message",children:t}),(0,k.jsxs)("div",{className:"ui-confirm-actions",children:[(0,k.jsx)(b,{variant:"secondary",onClick:i,children:r}),(0,k.jsx)(b,{variant:s?"danger":"primary",onClick:a,children:o})]})]})}var N=u(c());function Mn({message:e,onRetry:n}){let{t}=h();return(0,N.jsxs)("div",{className:"ui-error",role:"alert",children:[(0,N.jsx)("p",{className:"ui-error-text",children:e}),n?(0,N.jsx)(b,{variant:"secondary",size:"sm",onClick:n,children:t("common.retry")}):null]})}var An=`/* Game Night shared UI kit \u2014 mobile-first, theme via CSS vars.
   Dark mode is automatic: colors come from --bg/--surface/--text/etc. */

.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--tap);
  padding: 0 20px;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s ease, opacity 0.15s ease, background-color 0.15s ease;
}

.ui-btn:active {
  transform: scale(0.97);
}

.ui-btn-sm {
  min-height: 40px;
  padding: 0 14px;
  font-size: 0.875rem;
}

.ui-btn-lg {
  min-height: 56px;
  padding: 0 28px;
  font-size: 1.125rem;
}

.ui-btn-full {
  width: 100%;
}

.ui-btn-primary {
  background-color: var(--primary);
  color: var(--primary-ink);
}

.ui-btn-secondary {
  background-color: var(--surface-2);
  color: var(--text);
}

.ui-btn-danger {
  background-color: var(--danger);
  color: #fff;
}

.ui-btn-success {
  background-color: var(--success);
  color: #fff;
}

.ui-btn-ghost {
  background-color: transparent;
  border: 2px solid var(--muted);
  color: var(--text);
}

.ui-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.ui-btn:focus-visible,
.ui-card:focus-visible,
.ui-modal-panel:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

/* Card */

.ui-card {
  background-color: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 16px;
}

.ui-card-title {
  margin: 0 0 12px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

/* Modal */

.ui-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.5);
}

.ui-modal-panel {
  position: relative;
  background-color: var(--surface);
  color: var(--text);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  width: calc(100% - 32px);
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px;
}

.ui-modal-title {
  margin: 0 0 12px;
  font-size: 1.25rem;
  font-weight: 700;
}

.ui-confirm-message {
  margin: 0 0 16px;
  color: var(--text);
  line-height: 1.5;
}

.ui-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Toasts */

.ui-toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 84px; /* above the bottom nav */
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: calc(100% - 32px);
  max-width: 420px;
  pointer-events: none;
}

.ui-toast {
  background-color: #1c1c1e;
  color: #fff;
  border-radius: 999px;
  padding: 12px 20px;
  font-size: 0.9375rem;
  font-weight: 600;
  box-shadow: var(--shadow);
  text-align: center;
  max-width: 100%;
}

.ui-toast-success {
  background-color: var(--success);
  color: #fff;
}

.ui-toast-error {
  background-color: var(--danger);
  color: #fff;
}

/* Timer */

.ui-timer {
  font-size: 3.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  color: var(--text);
  text-align: center;
  line-height: 1.1;
}

.ui-timer-low {
  color: var(--danger);
}

/* Avatar */

.ui-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
}

/* Scoreboard */

.ui-scoreboard {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ui-score-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--tap);
  padding: 8px 12px;
  border-bottom: 1px solid var(--surface-2);
  border-radius: var(--radius-sm);
}

.ui-score-row:last-child {
  border-bottom: none;
}

.ui-score-row-highlight {
  background-color: var(--accent);
  color: var(--primary-ink);
}

.ui-score-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ui-score-name {
  flex: 1;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-score-value {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* Game header */

.ui-game-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  min-height: var(--tap);
}

.ui-game-title {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-game-back {
  white-space: nowrap;
}

.ui-game-restart {
  min-width: var(--tap);
  font-size: 1.25rem;
  padding: 0 10px;
}

.ui-game-restart-spacer {
  min-width: var(--tap);
  flex-shrink: 0;
}

/* Spinner */

.ui-spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 4px solid var(--surface-2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: ui-spin 0.8s linear infinite;
}

@keyframes ui-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error message */

.ui-error {
  background-color: color-mix(in srgb, var(--danger) 12%, transparent);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-error-text {
  margin: 0;
  color: var(--text);
  font-weight: 600;
  line-height: 1.4;
}

.ui-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.ui-modal-close:active {
  transform: scale(0.92);
}
`,Be=document.createElement("style");Be.textContent=An;document.head.appendChild(Be);var y=u(w()),Ae=u(c());function Me(e){let n=Math.floor(e/60),t=e%60;return`${n}:${String(t).padStart(2,"0")}`}function Dn({seconds:e,running:n,onDone:t,onTick:o}){let[r,a]=(0,y.useState)(e),i=(0,y.useRef)(e),s=(0,y.useRef)(!1),m=(0,y.useRef)(t),d=(0,y.useRef)(o);m.current=t,d.current=o,(0,y.useEffect)(()=>{i.current=e,s.current=!1,a(e),d.current?.(e)},[e]),(0,y.useEffect)(()=>{if(!n)return;let _e=window.setInterval(()=>{i.current<=0||(i.current-=1,a(i.current),d.current?.(i.current),i.current===0&&!s.current&&(s.current=!0,m.current?.()))},1e3);return()=>window.clearInterval(_e)},[n]);let He=r<=10&&r>0;return(0,Ae.jsx)("div",{className:`ui-timer${He?" ui-timer-low":""}`,role:"timer","aria-label":Me(r),children:Me(r)})}var v=u(c());function Hn({entries:e}){return(0,v.jsx)("ol",{className:"ui-scoreboard",children:e.map((n,t)=>(0,v.jsxs)("li",{className:`ui-score-row${n.highlight?" ui-score-row-highlight":""}`,children:[(0,v.jsx)("span",{className:"ui-score-dot",style:{backgroundColor:n.color??"#888"},"aria-hidden":"true"}),(0,v.jsx)($,{name:n.name,color:n.color,size:36}),(0,v.jsx)("span",{className:"ui-score-name",children:n.name}),(0,v.jsx)("span",{className:"ui-score-value",children:n.score})]},`${n.name}-${t}`))})}var C=u(c());function _n({title:e,onBack:n,onRestart:t}){let{t:o}=h();return(0,C.jsxs)("header",{className:"ui-game-header",children:[(0,C.jsxs)("button",{type:"button",className:"ui-btn ui-btn-ghost ui-btn-sm ui-game-back",onClick:n,"aria-label":o("common.back"),children:["\u2190 ",o("common.back")]}),(0,C.jsx)("h1",{className:"ui-game-title",children:e}),t?(0,C.jsx)("button",{type:"button",className:"ui-btn ui-btn-ghost ui-btn-sm ui-game-restart",onClick:t,"aria-label":o("common.restart"),children:"\u21BB"}):(0,C.jsx)("span",{className:"ui-game-restart-spacer","aria-hidden":"true"})]})}var De=u(w());var R=u(c()),J=class extends De.Component{state={error:null};static getDerivedStateFromError(n){return{error:n}}componentDidCatch(n,t){console.error("[game-night] game screen failed to load",n)}render(){return this.state.error?this.props.fallback(this.state.error):this.props.children}};function Fn({children:e}){let{t:n}=h();return(0,R.jsx)(J,{fallback:t=>(0,R.jsxs)(W,{children:[(0,R.jsx)("p",{style:{textAlign:"center",fontWeight:700},children:n("errors.gameLoad")}),(0,R.jsx)(b,{variant:"primary",fullWidth:!0,onClick:()=>window.location.reload(),children:n("common.retry")}),t&&(0,R.jsxs)("p",{style:{textAlign:"center",color:"#b0a89f",fontSize:"0.72rem",marginTop:"0.6rem",wordBreak:"break-word"},children:[t.name,": ",t.message]})]}),children:e})}export{E as a,u as b,w as c,ct as d,h as e,c as f,b as g,W as h,Y as i,Pn as j,Sn as k,Dn as l,$ as m,Hn as n,_n as o,Ln as p,Bn as q,Mn as r,Fn as s};
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
