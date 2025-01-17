import cookie from "js-cookie"
import { defineStore } from "pinia"
import { parse } from "set-cookie-parser"
import sha256 from "sha256"
import { DangNhap } from "src/apis/runs/dang-nhap"
import { i18n } from "src/boot/i18n"
import { post } from "src/logic/http"

interface User {
  avatar?: string
  email: string // const
  name: string // const
  sex: string
  username: string
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user_data: parseJSON(cookie.get("user_data")) as null | User,
    token_name: (cookie.get("token_name") ?? null) as null | string,
    token_value: (cookie.get("token_value") ?? null) as null | string,
  }),
  getters: {
    user(state) {
      return state.user_data
    },
    uid(state) {
      if (!state.user_data) return null
      return sha256(state.user_data.email + state.user_data.name)
    },
    isLogged(state) {
      return !!state.token_name && !!state.token_value && !!state.user_data
    },
  },
  actions: {
    setUser(value: User, expires: Date) {
      this.user_data = value
      cookie.set("user_data", JSON.stringify(value), {
        expires,
        sameSite: "None",
        secure: true,
      })
    },
    setToken(name: string, value: string, expires: Date) {
      this.token_name = name
      this.token_value = value
      cookie.set("token_name", name, {
        expires,
        sameSite: "None",
        secure: true,
      })
      cookie.set("token_value", value, {
        expires,
        sameSite: "None",
        secure: true,
      })
    },
    deleteUser() {
      this.user_data = null
      cookie.set("user_data", "", { expires: -1 })
    },
    deleteToken() {
      this.token_name = null
      this.token_value = null
      cookie.set("token_name", "", { expires: -1 })
      cookie.set("token_value", "", { expires: -1 })
    },
    setTokenByCookie(cookie: string) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const token = cookie
        .split(",")
        .map((item) => parse(item))
        .flat(1)
        .find((item) => item.name.startsWith("token"))!
      // set token
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.setToken(token.name, token.value, token.expires!)
      return token
    },
    // ** actions **
    async login(email: string, password: string) {
      const data = await DangNhap(email, password)

      const { expires } = this.setTokenByCookie(data.cookie)
      this.setUser(
        {
          avatar: data.avatar,
          email: data.email,
          name: data.name,
          sex: data.sex,
          username: data.username,
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expires!
      )

      return data
    },
    async logout() {
      this.deleteToken()
      this.deleteUser()
    },
    async changePassword(newPassword: string) {
      if (!this.user_data)
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error(
          i18n.global.t("errors.require_login_to", [
            i18n.global.t("thay-doi-mat-khau"),
          ])
        )

      const { headers } = await post(
        "/account/info/",
        {
          "User[hoten]": this.user_data.username,
          "User[gender]": this.user_data.sex,
          "User[password]": newPassword,
          submit: "Cập nhật",
        },
        {
          cookie: `${this.token_name}=${this.token_value}`,
        }
      ).catch((res) => {
        // eslint-disable-next-line promise/no-return-wrap
        if (res.status === 302 && res.data) return Promise.resolve(res)

        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(res)
      })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const cookie = new Headers(headers).get("set-cookie")!
      this.setTokenByCookie(cookie)
    },
  },
})

function parseJSON(value?: string) {
  if (!value) return null

  try {
    return JSON.parse(value) ?? null
  } catch {
    return null
  }
}
