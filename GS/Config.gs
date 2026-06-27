var STOCK_CODES = ["MWG", "FRT", "DGW", "PNJ", "MSN", "VNM", "SAB", "SBT", "QNS", "DBC", "VHC", "ANV", "DHG", "IMP", "TRA"];

var STOCK_PATTERN = new RegExp("\\b(" + STOCK_CODES.join("|") + ")\\b", "g");

var COMPANY_KEYWORDS = {
  MWG: ["Thế Giới Di Động", "Điện Máy Xanh", "Bách Hóa Xanh", "Mobile World", "CTCP Đầu tư Thế Giới Di Động"],
  FRT: ["FPT Retail", "FPT Shop", "Nhà thuốc Long Châu", "Bán lẻ Kỹ thuật số FPT"],
  DGW: ["Digiworld", "Thế Giới Số", "CTCP Thế Giới Số"],
  PNJ: ["Vàng bạc đá quý Phú Nhuận", "Trang sức PNJ", "Vàng Phú Nhuận"],
  MSN: ["Masan", "Tập đoàn Masan", "WinMart", "WinCommerce", "Masan Consumer", "Masan Group"],
  VNM: ["Vinamilk", "Sữa Việt Nam", "CTCP Sữa Việt Nam"],
  SAB: ["Sabeco", "Bia Sài Gòn", "Bia Rượu Nước giải khát Sài Gòn"],
  SBT: ["Thành Thành Công", "TTC AgriS", "Mía đường Thành Thành Công", "Đường Biên Hòa"],
  QNS: ["Đường Quảng Ngãi", "Vinasoy", "Sữa đậu nành Vinasoy"],
  DBC: ["Dabaco", "Tập đoàn Dabaco", "Heo Dabaco"],
  VHC: ["Vĩnh Hoàn", "Thủy sản Vĩnh Hoàn", "Cá tra Vĩnh Hoàn"],
  ANV: ["Nam Việt", "Thủy sản Nam Việt", "Navico"],
  DHG: ["Dược Hậu Giang", "DHG Pharma", "Dược phẩm Hậu Giang"],
  IMP: ["Imexpharm", "Dược phẩm Imexpharm"],
  TRA: ["Traphaco", "Dược phẩm Traphaco", "CTCP Traphaco"]
};

var COMPANY_INFO = [
  {code: "MWG", full_name: "CTCP Đầu tư Thế Giới Di Động", english_name: "Mobile World Investment Corp", former_name: "", exchange: "HOSE", industry: "Bán lẻ", website: "mwg.vn", established: "2004", employees: "60.000+", business: "Bán lẻ điện thoại, điện máy, bách hóa", keywords: "Thế Giới Di Động, Bách Hóa Xanh"},
  {code: "FRT", full_name: "CTCP Bán lẻ Kỹ thuật số FPT", english_name: "FPT Digital Retail JSC", former_name: "", exchange: "HOSE", industry: "Bán lẻ", website: "fptshop.com.vn", established: "2012", employees: "15.000+", business: "Bán lẻ thiết bị công nghệ, chuỗi nhà thuốc Long Châu", keywords: "FPT Shop, Long Châu"},
  {code: "DGW", full_name: "CTCP Thế Giới Số", english_name: "Digiworld Corp", former_name: "", exchange: "HOSE", industry: "Phân phối bán lẻ", website: "digiworld.com.vn", established: "1997", employees: "1.000+", business: "Phân phối thiết bị ICT, hàng tiêu dùng, dược phẩm", keywords: "Digiworld"},
  {code: "PNJ", full_name: "CTCP Vàng bạc đá quý Phú Nhuận", english_name: "Phu Nhuan Jewelry JSC", former_name: "", exchange: "HOSE", industry: "Bán lẻ trang sức", website: "pnj.com.vn", established: "1988", employees: "7.000+", business: "Sản xuất, bán lẻ trang sức vàng bạc", keywords: "Vàng bạc đá quý Phú Nhuận"},
  {code: "MSN", full_name: "CTCP Tập đoàn Masan", english_name: "Masan Group Corp", former_name: "", exchange: "HOSE", industry: "Hàng tiêu dùng & Bán lẻ", website: "masangroup.com", established: "1996", employees: "40.000+", business: "Thực phẩm, đồ uống, chuỗi bán lẻ WinMart", keywords: "Masan, WinMart"},
  {code: "VNM", full_name: "CTCP Sữa Việt Nam", english_name: "Vietnam Dairy Products JSC", former_name: "", exchange: "HOSE", industry: "Thực phẩm (Sữa)", website: "vinamilk.com.vn", established: "1976", employees: "10.000+", business: "Sản xuất và phân phối các sản phẩm từ sữa", keywords: "Vinamilk"},
  {code: "SAB", full_name: "Tổng CTCP Bia - Rượu - Nước giải khát Sài Gòn", english_name: "Sabeco", former_name: "", exchange: "HOSE", industry: "Đồ uống", website: "sabeco.com.vn", established: "1977", employees: "12.000+", business: "Sản xuất và kinh doanh bia rượu", keywords: "Sabeco, Bia Sài Gòn"},
  {code: "SBT", full_name: "CTCP Thành Thành Công - Biên Hòa", english_name: "TTC AgriS", former_name: "Đường Biên Hòa", exchange: "HOSE", industry: "Thực phẩm (Đường)", website: "ttcsugar.com.vn", established: "1995", employees: "3.000+", business: "Sản xuất mía đường, nông sản", keywords: "TTC AgriS, Mía đường"},
  {code: "QNS", full_name: "CTCP Đường Quảng Ngãi", english_name: "Quang Ngai Sugar JSC", former_name: "", exchange: "UPCOM", industry: "Thực phẩm & Đồ uống", website: "qns.com.vn", established: "2005", employees: "4.000+", business: "Sản xuất đường, sữa đậu nành Vinasoy", keywords: "Đường Quảng Ngãi, Vinasoy"},
  {code: "DBC", full_name: "CTCP Tập đoàn Dabaco Việt Nam", english_name: "Dabaco Group", former_name: "", exchange: "HOSE", industry: "Thực phẩm (Nông nghiệp)", website: "dabaco.com.vn", established: "1996", employees: "5.000+", business: "Chăn nuôi, thức ăn chăn nuôi, chế biến thực phẩm", keywords: "Dabaco"},
  {code: "VHC", full_name: "CTCP Vĩnh Hoàn", english_name: "Vinh Hoan Corp", former_name: "", exchange: "HOSE", industry: "Thực phẩm (Thủy sản)", website: "vinhhoan.com", established: "1997", employees: "6.000+", business: "Nuôi trồng và chế biến xuất khẩu cá tra", keywords: "Vĩnh Hoàn"},
  {code: "ANV", full_name: "CTCP Nam Việt", english_name: "Navico", former_name: "", exchange: "HOSE", industry: "Thực phẩm (Thủy sản)", website: "navicorp.com.vn", established: "1993", employees: "4.000+", business: "Nuôi trồng, chế biến thủy sản", keywords: "Nam Việt, Navico"},
  {code: "DHG", full_name: "CTCP Dược Hậu Giang", english_name: "DHG Pharma", former_name: "", exchange: "HOSE", industry: "Dược phẩm", website: "dhgpharma.com.vn", established: "1974", employees: "3.000+", business: "Sản xuất và phân phối dược phẩm", keywords: "Dược Hậu Giang"},
  {code: "IMP", full_name: "CTCP Dược phẩm Imexpharm", english_name: "Imexpharm Corp", former_name: "", exchange: "HOSE", industry: "Dược phẩm", website: "imexpharm.com", established: "1977", employees: "1.500+", business: "Sản xuất và phân phối dược phẩm", keywords: "Imexpharm"},
  {code: "TRA", full_name: "CTCP Traphaco", english_name: "Traphaco JSC", former_name: "", exchange: "HOSE", industry: "Dược phẩm", website: "traphaco.com.vn", established: "1972", employees: "1.500+", business: "Sản xuất dược phẩm từ dược liệu", keywords: "Traphaco"}
];

var SOURCE_INFO = [
  {name: "CafeF", domain: "cafef.vn", categories: "Doanh nghiệp, Thị trường, Vĩ mô", type: "RSS+API", rss: "Có", articles: "50k+", note: "Tin DN bán lẻ, báo cáo tài chính", has_rss: true, has_api: true},
  {name: "CafeBiz", domain: "cafebiz.vn", categories: "Câu chuyện kinh doanh", type: "API", rss: "Không", articles: "20k+", note: "Nhiều insight về chuỗi, chiến lược", has_rss: false, has_api: true},
  {name: "VnExpress", domain: "vnexpress.net", categories: "Kinh doanh", type: "RSS", rss: "Có", articles: "15k+", note: "Tin tức thị trường, bán lẻ", has_rss: true, has_api: false},
  {name: "VietnamNet", domain: "vietnamnet.vn", categories: "Kinh doanh, Doanh nghiệp, Thị trường", type: "RSS", rss: "Có", articles: "30k+", note: "Cập nhật tình hình kinh doanh", has_rss: true, has_api: false},
  {name: "VnEconomy", domain: "vneconomy.vn", categories: "Kinh doanh, Doanh nghiệp, Thị trường", type: "RSS", rss: "Có", articles: "15k+", note: "Phân tích sức mua, báo cáo thị trường", has_rss: true, has_api: false},
  {name: "VnBusiness", domain: "vnbusiness.vn", categories: "Doanh nghiệp, Thị trường", type: "RSS", rss: "Có", articles: "5k+", note: "Phân tích doanh nghiệp", has_rss: true, has_api: false},
  {name: "Dân trí", domain: "dantri.com.vn", categories: "Kinh doanh", type: "RSS", rss: "Có", articles: "5k+", note: "Tin kinh doanh và sức mua", has_rss: true, has_api: false},
  {name: "Doanh nghiệp VN", domain: "doanhnghiepvn.vn", categories: "Kinh doanh, Tiêu dùng", type: "RSS", rss: "Có", articles: "5k+", note: "Trang chuyên về doanh nghiệp, tiêu dùng", has_rss: true, has_api: false},
  {name: "Sức Khỏe & Đời Sống", domain: "suckhoedoisong.vn", categories: "Kinh tế", type: "RSS", rss: "Có", articles: "5k+", note: "Cực tốt cho mảng Dược phẩm và Thực phẩm", has_rss: true, has_api: false},
  {name: "ZNEWS", domain: "znews.vn", categories: "Kinh doanh, Tài chính", type: "RSS", rss: "Có", articles: "5k+", note: "Báo cáo tài chính, mở rộng chuỗi", has_rss: true, has_api: false},
  {name: "Soha", domain: "soha.vn", categories: "Kinh doanh", type: "RSS", rss: "Có", articles: "5k+", note: "Tin tức thị trường tiêu dùng", has_rss: true, has_api: false},
  {name: "Đầu Tư VN", domain: "dautuvietnam.com.vn", categories: "Doanh nghiệp, Kinh doanh", type: "RSS", rss: "Có", articles: "5k+", note: "Kênh của Báo Đầu Tư", has_rss: true, has_api: false},
  {name: "Đời Sống VN", domain: "doisongvietnam.vn", categories: "Kinh doanh", type: "RSS", rss: "Có", articles: "2k+", note: "Nhịp đập thị trường, FMCG", has_rss: true, has_api: false},
  {name: "Thanh Niên", domain: "thanhnien.vn", categories: "Kinh tế", type: "RSS", rss: "Có", articles: "10k+", note: "Chính sách, tình hình doanh nghiệp", has_rss: true, has_api: false}
];

var RSS_SOURCES = [
  {name: "Cafef DN", url: "https://cafef.vn/doanh-nghiep.rss", cat: "DN"},
  {name: "Cafef TT", url: "https://cafef.vn/thi-truong.rss", cat: "TT"},
  {name: "VnExpress KD", url: "https://vnexpress.net/rss/kinh-doanh.rss", cat: "KD"},
  {name: "Vietnamnet KD", url: "https://vietnamnet.vn/rss/kinh-doanh.rss", cat: "KD"},
  {name: "Vietnamnet DN", url: "https://vietnamnet.vn/rss/doanh-nghiep.rss", cat: "DN"},
  {name: "Vietnamnet TT", url: "https://vietnamnet.vn/rss/thi-truong.rss", cat: "TT"},
  {name: "VnEconomy KD", url: "https://vneconomy.vn/kinh-doanh.rss", cat: "KD"},
  {name: "VnEconomy DN", url: "https://vneconomy.vn/doanh-nhan.rss", cat: "DN"},
  {name: "VnEconomy TT", url: "https://vneconomy.vn/thi-truong.rss", cat: "TT"},
  {name: "VnBusiness DN", url: "https://vnbusiness.vn/rss/doanh-nghiep.rss", cat: "DN"},
  {name: "VnBusiness TT", url: "https://vnbusiness.vn/rss/thi-truong.rss", cat: "TT"},
  {name: "Dân trí KD", url: "https://dantri.com.vn/rss/kinh-doanh.rss", cat: "KD"},
  {name: "DOANH_NGHIEP_VN KD", url: "https://doanhnghiepvn.vn/rss/kinh-doanh-va-tieu-dung-1052.rss", cat: "KD"},
  {name: "SUC_KHOE_DS KT", url: "https://suckhoedoisong.vn/rss/kinh-te.rss", cat: "KD"},
  {name: "ZNEWS KD", url: "https://znews.vn/rss/kinh-doanh-tai-chinh.rss", cat: "KD"},
  {name: "Soha KD", url: "https://soha.vn/rss/kinh-doanh.rss", cat: "KD"},
  {name: "DAU_TU_VIET_NAM DN", url: "https://dautuvietnam.com.vn/rss/doanh-nghiep.rss", cat: "DN"},
  {name: "DAU_TU_VIET_NAM KD", url: "https://dautuvietnam.com.vn/rss/kinh-doanh.rss", cat: "KD"},
  {name: "DOI_SONG_VN KD", url: "https://doisongvietnam.vn/rss/kinh-doanh.rss", cat: "KD"},
  {name: "Thanh Niên KD", url: "https://thanhnien.vn/rss/kinh-te.rss", cat: "KD"}
];

var API_SOURCES = [
  {type: "cafef", name: "CafeF DN", cat: "DN", zone_id: 18836, domain: "https://cafef.vn"},
  {type: "cafef", name: "CafeF Vĩ mô", cat: "Vĩ mô", zone_id: 18833, domain: "https://cafef.vn"},
  {type: "cafebiz", name: "CafeBiz Câu chuyện KD", cat: "KD", zone_id: 176127, domain: "https://cafebiz.vn"}
];

var SEARCH_TERMS = {
  "MWG": ["MWG doanh thu", "Thế Giới Di Động đóng cửa", "Bách Hóa Xanh lợi nhuận"],
  "FRT": ["FRT kết quả kinh doanh", "Nhà thuốc Long Châu mở mới", "FPT Retail doanh thu"],
  "DGW": ["DGW Digiworld", "Digiworld phân phối", "Digiworld doanh thu"],
  "PNJ": ["PNJ sức mua", "Vàng Phú Nhuận lợi nhuận", "Trang sức PNJ"],
  "MSN": ["Masan Winmart", "Masan doanh thu", "Masan Consumer"],
  "VNM": ["Vinamilk thị phần", "Sữa Việt Nam xuất khẩu", "Vinamilk doanh thu"],
  "SAB": ["Sabeco tiêu thụ", "Bia Sài Gòn doanh thu", "Sabeco lợi nhuận"],
  "SBT": ["TTC AgriS mía đường", "Đường Biên Hòa"],
  "QNS": ["Vinasoy doanh thu", "Đường Quảng Ngãi"],
  "DBC": ["Dabaco giá heo", "Dabaco lợi nhuận"],
  "VHC": ["Vĩnh Hoàn xuất khẩu cá tra", "Thủy sản Vĩnh Hoàn"],
  "ANV": ["Nam Việt xuất khẩu", "Thủy sản Navico"],
  "DHG": ["Dược Hậu Giang doanh thu", "DHG Pharma"],
  "IMP": ["Imexpharm thuốc", "Dược Imexpharm"],
  "TRA": ["Traphaco kết quả kinh doanh", "Dược Traphaco"]
};

var INDUSTRY_SEARCH = [
  "sức mua tiêu dùng giảm",
  "doanh thu bán lẻ phục hồi",
  "ngành điện máy ế ẩm",
  "cuộc đua mở chuỗi nhà thuốc",
  "thương mại điện tử bán lẻ",
  "lợi nhuận doanh nghiệp thực phẩm",
  "xuất khẩu thủy sản",
  "ngành dược phẩm tăng trưởng"
];

var CONFIG_KEYWORDS_DATA = [];
(function buildKwData() {
  var kwid = 0;
  for (var code in SEARCH_TERMS) {
    var terms = SEARCH_TERMS[code];
    for (var i = 0; i < terms.length; i++) {
      kwid++;
      CONFIG_KEYWORDS_DATA.push({
        keyword_id: "KW" + ("000" + kwid).slice(-3),
        keyword: terms[i],
        industry_group: "Bán lẻ / Tiêu dùng",
        related_tickers: code,
        event_type_suggestion: "earnings, expansion, contraction",
        priority: "High",
        note: "Mã cổ phiếu " + code
      });
    }
  }
  for (var j = 0; j < INDUSTRY_SEARCH.length; j++) {
    kwid++;
    CONFIG_KEYWORDS_DATA.push({
      keyword_id: "KW" + ("000" + kwid).slice(-3),
      keyword: INDUSTRY_SEARCH[j],
      industry_group: "Bán lẻ / FMCG",
      related_tickers: "ALL",
      event_type_suggestion: "macro_sentiment, industry_trend",
      priority: "Medium",
      note: "Tìm kiếm theo ngành"
    });
  }
})();

// LƯU Ý: HÃY THAY ID SHEET CỦA BẠN VÀO ĐÂY NHÉ!
var SPREADSHEET_ID = "1GXiwp5WFwehYJR53C9dyM3LzCTqwg6Bhj10z7uMX7H4";

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

var HTTP_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
};

var REQUEST_TIMEOUT = 30;
var MAX_RETRIES = 2;

var BLOCKED_DOMAINS = [
  "wikipedia.org","hhs.gov","grokipedia","wikidata.org",
  "wikimedia.org","windy.com","pinterest","nordinvasion.com",
  "youtube.com","facebook.com"
];

var VIETNAMESE_CHARS_REGEX = new RegExp(
  "[ăâđêôơưàảãáạăằẳẵắặâầẩẫấậđèẻẽéẹêềểễếệìỉĩíịòỏõóọôồổỗốộơờởỡớợùủũúụưừửữứựỳỷỹýỵ]", "i"
);

var COMPANY_NAME_PATTERNS = {};
(function buildNamePatterns() {
  for (var code in COMPANY_KEYWORDS) {
    var escaped = COMPANY_KEYWORDS[code].map(function(kw) {
      return kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    });
    COMPANY_NAME_PATTERNS[code] = new RegExp("(" + escaped.join("|") + ")", "i");
  }
})();