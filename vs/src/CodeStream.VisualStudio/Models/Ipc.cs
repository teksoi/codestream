﻿using CodeStream.VisualStudio.Extensions;
using Newtonsoft.Json.Linq;

namespace CodeStream.VisualStudio.Models
{
    public class Ipc
    {
        public static string ToResponseMessage(string id, bool payload, string error = null)
        {
            return ToResponseMessage(id, payload.ToString().ToLower(), error);
        }

        public static string ToResponseMessage(string id, JToken payload, string error = null)
        {
            return ToResponseMessage(id, payload?.ToString(), error);
        }

        public static string ToResponseMessage(string id, string payload, string error = null)
        {
            string type = "codestream:response";

            payload = GetPayload(payload);

            if (error.IsNullOrWhiteSpace())
            {
                return @"{""type"":""" + type + @""",""body"":{""id"": """ + id + @""",""payload"":" + payload + @"}}";
            }
            else
            {
                if (payload.IsNullOrWhiteSpace())
                {
                    return @"{""type"":""" + type + @""",""body"":{""id"":""" + id + @""",""error"":""" + error + @"""}}";
                }

                return @"{""type"":""" + type + @""",""body"":{""id"":""" + id + @""",""payload"":" + payload + @",""error"":""" + error + @"""}}";
            }
        }

        public static string ToLegacyMessage(string type, string payload)
        {
            payload = GetPayload(payload);

            return @"{""type"":""" + type + @""",""body"":  " + payload + @"}";
        }

        public static string ToDataMessage(string type, string payload)
        {
            payload = GetPayload(payload);

            return @"{""type"":""codestream:data"",""body"":{""type"":""" + type + @""",""payload"":" + payload + @"}}";
        }

        public static string ToCommentOnSelectMessage(bool enabled)
        {
            return @"{""type"":""codestream:configs"",""body"":{""openCommentOnSelect"":" + enabled.ToString().ToLower() + @"}}";
        }

        public static string ToShowMarkersMessage(bool enabled)
        {
            return @"{""type"":""codestream:configs"",""body"":{""showMarkers"":" + enabled.ToString().ToLower() + @"}}";
        }

        public static string ToConnectivityMessage(string type)
        {
            return @"{""type"":""" + type + @""",""body"":{}}";
        }

        private static string GetPayload(string payload)
        {
            if (payload.IsNullOrWhiteSpace())
            {
                payload = null;
            }

            if (payload != null && !payload.StartsWith("{") && payload != "true" && payload != "false")
            {
                payload = $"\"{payload}\"";
            }

            return payload;
        }
    }
}