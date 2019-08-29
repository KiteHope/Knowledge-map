using System;
using System.Collections.Generic;
using System.Web.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using 历史人物可视化.Models;

namespace 历史人物可视化.Controllers
{
    public class HomeController : Controller
    {
        public ViewResult Index()
        {
            return View();
        }
    }
}