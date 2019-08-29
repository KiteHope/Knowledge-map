using System;
using System.Collections.Generic;
using System.Web.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using 历史人物可视化.Models;


namespace 历史人物可视化.Controllers
{
    public class DisplayController : Controller
    {
        const int page_size = 16; //每页展示人数
        const int p_len = 80;     //人物简介字数
        List<BsonDocument> documents = new List<BsonDocument>();
        Dictionary<string, object> relation_dic = new Dictionary<string, object>();

        #region

        /// <summary>
        /// 无返回值检索
        /// </summary>
        /// <param name="DB_name"></param>
        /// <param name="collection_name"></param>
        /// <param name="filter"></param>
        public void GetBsonDocument(string DB_name, string collection_name, FilterDefinition<BsonDocument> filter, string entity_name="", bool is_first=false, int flag=0)
        {
            var client = new MongoClient("mongodb://localhost:27017");
            var database = client.GetDatabase(DB_name);
            var collection = database.GetCollection<BsonDocument>(collection_name);

            var sort = Builders<BsonDocument>.Sort.Descending("Heat");
            var projection = Builders<BsonDocument>.Projection.Exclude("_id");

            var cursor = collection.Find(filter).Project(projection).Sort(sort).ToCursor();
            foreach (var document in cursor.ToEnumerable())
            {
                if (!is_first)
                {
                    if (!relation_dic.ContainsKey(document["Name"].ToString()) && document["Name"].ToString() != entity_name)
                        documents.Add(document);
                    if (flag == 1)
                        relation_dic.Add(document["Name"].ToString(), document["Relation"][entity_name][0].ToString().Split(' '));
                }
                else
                {
                    documents.Add(document);
                }
            }
        }

        /// <summary>
        /// 有返回值检索
        /// </summary>
        /// <param name="DB_name"></param>
        /// <param name="collection_name"></param>
        /// <param name="filter"></param>
        /// <returns>List<BsonDocument></returns>
        public List<BsonDocument> Get_BsonDocuments(string DB_name, string collection_name, FilterDefinition<BsonDocument> filter)
        {
            List<BsonDocument> documents = new List<BsonDocument>();
            var client = new MongoClient("mongodb://localhost:27017");
            var database = client.GetDatabase(DB_name);
            var collection = database.GetCollection<BsonDocument>(collection_name);

            var sort = Builders<BsonDocument>.Sort.Descending("Heat");
            var projection = Builders<BsonDocument>.Projection.Exclude("_id");

            var cursor = collection.Find(filter).Project(projection).Sort(sort).ToCursor();
            foreach (var document in cursor.ToEnumerable())
            {
                documents.Add(document);
            }
            return documents;
        }

        /// <summary>
        /// 人物知识图谱动态加载数据
        /// </summary>
        /// <param name="name"></param>
        /// <param name="tag"></param>
        /// <returns></returns>
        public JsonResult Mongo(string name, string tag)
        {
            List<BsonDocument> rela_documents;
            Dictionary<string, object> dic = new Dictionary<string, object>();
            if (tag == "PER")
            {
                var filter = Builders<BsonDocument>.Filter.Eq("Name", name);
                rela_documents = Get_BsonDocuments("figures", "Person2_copy", filter);

                if (rela_documents.Count > 0)
                    dic = rela_documents[0]["Relation"].AsBsonDocument.ToDictionary();
            }
            else
            {
                var filter = Builders<BsonDocument>.Filter.Exists("Relation." + name, true);
                rela_documents = Get_BsonDocuments("figures", "Person2_copy", filter);
                if (rela_documents.Count > 0)
                {
                    foreach (BsonDocument document in rela_documents)
                    {
                        List<string> rela = new List<string>();
                        rela.Add(document["Relation"][name][0].ToString());
                        rela.Add("PER");
                        dic.Add(document["Name"].ToString(), rela);
                    }
                }
            }

            return Json(dic, JsonRequestBehavior.AllowGet);
        }

        /// <summary>
        /// 获取人物足迹地点字典
        /// </summary>
        /// <param name="name"></param>
        /// <returns></returns>
        public JsonResult GetPlace(string name)
        {
            Dictionary<string, object> place_count = new Dictionary<string, object>();
            var filter = Builders<BsonDocument>.Filter.Eq("Name", name);
            GetBsonDocument("figures", "Person2_copy", filter);
            var Path = documents[0]["Biography1"].AsBsonArray;
            foreach (var path in Path)
            {
                if (path["Coord"].AsBsonArray.Count > 1)
                {
                    foreach(var coord in path["Coord"].AsBsonArray)
                    {
                        string key = coord[0].ToString() + ',' + coord[1].ToString();
                        if (place_count.ContainsKey(key))
                        {
                            int isCoint = Int32.Parse(place_count[key].ToString());
                            place_count[key] = isCoint + 1;
                        }
                        else
                            place_count.Add(key, 1);
                    }
                }
            }
            return Json(place_count, JsonRequestBehavior.AllowGet);
        }

        #endregion

        #region
        /// <summary>
        /// 人物检索页
        /// </summary>
        /// <param name="page"></param>
        /// <returns></returns>
        public ActionResult Search(string entity_name, int page)
        {
            List<Entity> e = new List<Entity>();

            if (documents.Count == 0)
            {
                //全部检索
                if (entity_name == "all")
                {
                    GetBsonDocument("figures", "Person2_copy", new BsonDocument());
                }

                //特定查询
                else
                {
                    //Step1.获取人名
                    var filter = Builders<BsonDocument>.Filter.Eq("Name", entity_name);
                    GetBsonDocument("figures", "Person2_copy", filter, entity_name, true, 0);

                    //Step2.获取人物关系
                    filter = Builders<BsonDocument>.Filter.Exists("Relation." + entity_name, true);
                    GetBsonDocument("figures", "Person2_copy", filter, entity_name, false, 1);

                    //Step3.获取关键词
                    filter = Builders<BsonDocument>.Filter.In("Keyword.Word", new[] { entity_name });
                    GetBsonDocument("figures", "Person2_copy", filter, entity_name, false, 0);
                }
            }

            if (documents.Count > 0)
            {
                ViewBag.Count = Math.Ceiling(Convert.ToDouble(documents.Count) / page_size);

                int start_index = (page - 1) * 16;
                for (int i = start_index; i < start_index + 16; i++)
                {
                    if (i < documents.Count)
                    {
                        Entity peo = new Entity();
                        peo.Name = documents[i]["Name"].ToString();
                        try
                        {
                            string[] s = documents[i]["Introduction"].AsBsonArray[0].ToString().Split('。');
                            if (s[0].Length > p_len)
                            {
                                s[0] = s[0].Substring(0, p_len);
                                int index = s[0].LastIndexOf('，');
                                s[0] = s[0].Substring(0, index);
                            }
                            s[0] += '。';
                            peo.Introduction.Add(s[0]);

                        }
                        catch { peo.Introduction.Add("暂无人物描述"); }
                        e.Add(peo);
                    }
                    else
                        break;
                }
                ViewBag.Entity = e;
                ViewBag.Relation = relation_dic;
                ViewBag.Total = e.Count;
            }
            else
            {
                ViewBag.Count = 0;
                ViewBag.Total = 0;
            }

            ViewBag.Page = page;
            ViewBag.Search = entity_name;

            return View();
        }

        /// <summary>
        /// 人物信息页
        /// </summary>
        /// <param name="name"></param>
        /// <returns></returns>
        public ActionResult Detail(string name)
        {
            var filter = Builders<BsonDocument>.Filter.Eq("Name", name);
            List<BsonDocument> detail_list = Get_BsonDocuments("figures", "Person2_copy", filter);
            if (detail_list.Count > 0)
            {
                ViewBag.People = detail_list[0];
                return View();
            }
            else
            {
                return View("~/Views/Display/Search.cshtml");
            }
        }

        /// <summary>
        /// 人物知识图谱
        /// </summary>
        /// <param name="name"></param>
        /// <returns></returns>
        public ActionResult About(string name)
        {
            var filter = Builders<BsonDocument>.Filter.Eq("Name", name);
            GetBsonDocument("figures", "Person2_copy", filter);
            ViewBag.Relation = documents[0]["Relation"];
            ViewBag.Name = documents[0]["Name"];
            return View();
        }

        /// <summary>
        /// 人物足迹可视化
        /// </summary>
        /// <returns></returns>
        public ActionResult Vision(string name)
        {
            Dictionary<string, object> place_count = new Dictionary<string, object>();
            var filter = Builders<BsonDocument>.Filter.Eq("Name", name);
            GetBsonDocument("figures", "Person2_copy", filter);
            var Path = documents[0]["Biography1"].AsBsonArray;
            ViewBag.Name = name;
            ViewBag.Count = 0;
            if (Path.Count > 0)
            {
                ViewBag.Path = Path;
                ViewBag.From = Path[0]["Time"][0].ToString().Substring(0, 4);
                ViewBag.From += "0101";
                ViewBag.End = Path[Path.Count - 1]["Time"][0].ToString().Substring(0, 4);
                ViewBag.End += "0101";
                return View();
            }
            else
                return View("~/Views/Display/Search.cshtml");
        }

        #endregion
    }
}